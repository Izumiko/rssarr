import React from "react"
import {
  Card,
  CardContent,
  List,
  ListItemButton,
  ListItemText,
  CircularProgress,
  Typography,
} from "@mui/material";
import axios from "axios";
import { useNotify } from "ra-core";
import { useEffect, useMemo } from "react";
import useSWR from "swr";
import { useBus, useBusField } from "./Bus.tsx";

const fetcher = async (url: string): Promise<string[]> => {
  // use a proxy to bypass CORS
  const { data } = await axios.get(
    new URL(`proxy?url=${encodeURIComponent(url)}`, location.href).href,
    {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    }
  );
  return data;
};

const Aside = () => {
  const notify = useNotify();
  const bus = useBus();

  const url = useBusField("url");

  const { data, mutate, isValidating } = useSWR(url, fetcher, {
    fallbackData: [],
    onError: (e, url) => {
      notify(`Unable to fetch proxy for '${url}': ${e.message}`);
    },
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
  });

  useEffect(() => {
    if (!bus) return;
    const listener = () => mutate(undefined, true);
    bus.on("refresh", listener);
    return () => {
      bus.off("refresh", listener);
    };
  }, [bus, mutate]);

  const patternString: string = useBusField("pattern") ?? "";
  const patternRegex = useMemo(() => {
    try {
      return new RegExp(`^${patternString}$`);
    } catch (e) {
      // invalid regex
      return null;
    }
  }, [patternString]);
  const matchedData = useMemo(() => {
    return data.map((title: string) => ({
      title,
      matched: patternRegex && Boolean(title.match(patternRegex)),
    }));
  }, [patternRegex, data]);

  return (
    <Card style={{ marginLeft: 20 }}>
      <CardContent style={{ height: "75vh", position: "relative" }}>
        <div
          style={{
            position: "relative",
            width: 400,
            height: "100%",
            overflow: "auto",
          }}
        >
          {matchedData.length > 0 ? (
            <List>
              {matchedData.map(({ title, matched }, i) => (
                <ListItemButton
                  key={i}
                  dense
                  disableGutters
                  divider
                  onClick={() => {
                    bus?.emit("item", title);
                  }}
                >
                  <ListItemText
                    primary={title}
                    sx={[matched && { color: '#1976d2' }]}
                  />
                </ListItemButton>
              ))}
            </List>
          ) : (
            <div
              style={{
                position: "absolute",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                left: 0,
                top: 0,
                right: 0,
                height: "100%",
              }}
            >
              <Typography>Enter RSS URL to fetch</Typography>
            </div>
          )}
        </div>
        {isValidating && (
          <div
            style={{
              position: "absolute",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              left: 0,
              top: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "rgba(255, 255, 255, 0.5)",
            }}
          >
            <CircularProgress />
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default Aside;
