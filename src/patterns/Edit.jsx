import { Button, Grid, InputAdornment } from "@mui/material";
import { styled } from "@mui/material/styles";
import axios from "axios";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  AutocompleteInput,
  Create,
  Edit,
  SelectInput,
  SimpleForm,
  TextInput,
  useNotify,
  useRecordContext,
} from "react-admin";
import { useFormContext, useWatch } from "react-hook-form";
import useSWR from "swr";
import { useClipboard } from "use-clipboard-copy";
import Aside from "./Aside";
import { BusProvider, useBus } from "./Bus";

const EscapeButton = () => {
  const { setValue } = useFormContext();
  const pattern = useWatch({ name: "pattern" });
  const escape = () => setValue("pattern", pattern.replace(/[/\-\\^$*+?.()|[\]{}]/g, "\\$&"));
  return (
    <InputAdornment position="end">
      <Button color="primary" onClick={escape}>
        Escape
      </Button>
    </InputAdornment>
  );
};

const choicesFetcher = async (api) => {
  const { data } = await axios(`sonarr${api}`, {
    headers: {
      Authorization: `Bearer ${localStorage.getItem("token")}`,
    },
  });
  return data;
};

const useSeries = () => {
  const notify = useNotify();
  const { data: series } = useSWR("/series", choicesFetcher, {
    fallbackData: [],
    onError: (e) => {
      console.error(e);
      notify(`Fetch Sonarr series failed: ${e.message}`);
    },
  });
  return series;
};

const SeasonChoiceDiv = styled('div')({
  display: "inline-block",
  verticalAlign: "middle",
  width: 8,
  height: 8,
  borderRadius: "50%",
  marginRight: 8,
  backgroundColor: "red",
});

const SeasonChoice = () => {
  const record = useRecordContext();
  const { monitored, seasonNumber } = record;
  return (
    <div>
      <SeasonChoiceDiv sx={[ monitored && { backgroundColor: 'green' }]} />
      {`${seasonNumber}`.padStart(2, "0")}{" "}
    </div>
  );
};

const SeasonsInput = ({ series }) => {
  const seriesTitle = useWatch({ name: "series", defaultValue: "" });
  const seasonChoices = useMemo(
    () =>
      series
        ?.find(({ title }) => title === seriesTitle)
        ?.seasons?.map(({ seasonNumber, monitored }) => ({
          id: `${seasonNumber}`.padStart(2, "0"),
          seasonNumber,
          monitored,
        })),
    [series, seriesTitle]
  ) ?? [];

  return (
    <SelectInput
      source="season"
      choices={seasonChoices}
      optionText={<SeasonChoice />}
    />
  );
};

const RefreshButton = () => {
  const bus = useBus();

  const onClick = useCallback(() => {
    bus?.emit("refresh");
  }, []);

  return (
    <Button color="primary" onClick={onClick}>
      Refresh
    </Button>
  );
};

const ProxyButton = () => {
  const clipboard = useClipboard();
  const remote = useWatch({ name: "remote", defaultValue: "" });
  const notify = useNotify();

  return (
    <Button
      color="primary"
      onClick={() => {
        if (!remote) {
          notify("No remote link to proxy");
        } else {
          const url = remote.replace(/https?:\/\//, '');
          const proxy = `${location.protocol}//${location.host}${location.pathname}RSS/${url}`;
          clipboard.copy(proxy);
          notify("Proxied RSS link copied");
        }
      }}
    >
      Proxy
    </Button>
  );
};

const TorznabButton = () => {
  const clipboard = useClipboard();
  const remote = useWatch({ name: "remote", defaultValue: "" });
  const notify = useNotify();

  return (
    <Button
      color="primary"
      onClick={() => {
        if (!remote) {
          notify("No remote link for Torznab");
        } else {
          const url = remote.replace(/https?:\/\//, '');
          const torznab = `${location.protocol}//${location.host}${location.pathname}Torznab/${url}`;
          clipboard.copy(torznab);
          notify("Torznab link copied");
        }
      }}
    >
      Torznab
    </Button>
  );
};

function debounce(func, wait, immediate) {
  let timeout;
  return function() {
  	const context = this, args = arguments;
  	clearTimeout(timeout);
  	if (immediate && !timeout) func.apply(context, args);
  	timeout = setTimeout(function() {
  		timeout = null;
  		if (!immediate) func.apply(context, args);
  	}, wait);
  };
}

const RemoteInput = () => {
  const remote = useWatch({ name: "remote", defaultValue: "" });
  const bus = useBus();
  const onFetch = useMemo(
    () =>
      debounce((remote) => {
        bus?.setField("url", remote);
      }, 1000),
    [bus]
  );
  useEffect(() => {
    onFetch(remote);
  }, [remote, onFetch]);

  return (
    <TextInput
      fullWidth
      source="remote"
      type="url"
      InputProps={{
        endAdornment: (
          <>
            <RefreshButton />
            <ProxyButton />
            <TorznabButton />
          </>
        ),
      }}
    />
  );
};

const PatternInput = () => {
  const clipboard = useClipboard();
  const notify = useNotify();
  const { setValue } = useFormContext();

  const bus = useBus();
  useEffect(() => {
    if (!bus) return;
    const listener = (title) => {
      setValue("pattern", title.replace(/[/\-\\^$*+?.()|[\]{}]/g, "\\$&"));
      notify("Replaced pattern with selected item");
    };
    bus.on("item", listener);
    return () => {
      bus.off("item", listener);
    };
  }, [bus]);

  const pattern = useWatch({ name: "pattern", defaultValue: "" });
  useEffect(() => {
    bus?.setField("pattern", pattern);
  }, [pattern, bus]);

  return (
    <TextInput
      multiline
      fullWidth
      source="pattern"
      InputProps={{
        endAdornment: (
          <>
            <EscapeButton />
            <Button
              color="primary"
              onClick={() => {
                clipboard.copy("(?<episode>\\d+)");
                notify("Episode pattern copied");
              }}
            >
              Episode
            </Button>
            <Button
              color="primary"
              onClick={() => {
                clipboard.copy("(?<subgroup>.*?)");
                notify("SubGroup pattern copied");
              }}
            >
              Group
            </Button>
          </>
        ),
      }}
      onBlur
    />
  );
};

const PatternEdit = (props) => {
  const series = useSeries();
  const choices = useMemo(
    () =>
      series.map(({ title }) => ({
        id: title,
        name: title,
      })),
    [series]
  );

  return (
    <BusProvider>
      <Edit {...props} aside={<Aside />}>
        <SimpleForm>
          <TextInput disabled source="id" />
          <RemoteInput />
          <PatternInput />
          <AutocompleteInput fullWidth source="series" choices={choices} />
          <SeasonsInput series={series} />
          <TextInput source="offset" />
          <TextInput source="language" />
          <TextInput source="quality" />
        </SimpleForm>
      </Edit>
    </BusProvider>
  );
};

const patternDefaultValue = () => ({
  offset: 0,
  language: "Chinese",
  quality: "WEBDL 1080p",
});

const PatternCreate = (props) => {
  const series = useSeries();
  const choices = useMemo(
    () =>
      series.map(({ title }) => ({
        id: title,
        name: title,
      })),
    [series]
  );

  return (
    <BusProvider>
      <Create {...props} aside={<Aside />}>
        <SimpleForm defaultValues={patternDefaultValue}>
          <TextInput disabled source="id" />
          <RemoteInput />
          <PatternInput />
          <AutocompleteInput fullWidth source="series" choices={choices} />
          <SeasonsInput series={series} />
          <TextInput source="offset" />
          <TextInput source="language" />
          <TextInput source="quality" />
        </SimpleForm>
      </Create>
    </BusProvider>
  );
};

export { PatternCreate, PatternEdit };
