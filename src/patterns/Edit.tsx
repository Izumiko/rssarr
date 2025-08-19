import { Button, InputAdornment } from '@mui/material'
import { styled } from '@mui/material/styles'
import axios from 'axios'
import { useCallback, useEffect, useMemo } from 'react'
import {
  AutocompleteInput,
  Create,
  Edit,
  SelectInput,
  SimpleForm,
  TextInput,
  useNotify,
  useRecordContext,
  EditProps,
  CreateProps,
} from 'react-admin'
import { useFormContext, useWatch } from 'react-hook-form'
import useSWR from 'swr'
import Aside from './Aside'
import { BusProvider, useBus } from './Bus'

const EscapeButton = () => {
  const { setValue } = useFormContext()
  const pattern = useWatch({ name: 'pattern' })
  const escape = () => setValue('pattern', pattern.replace(/[/\-\\^$*+?.()|[\]{}]/g, '\\$&'))
  return (
    <InputAdornment position="end">
      <Button color="primary" onClick={escape}>
        Escape
      </Button>
    </InputAdornment>
  )
}

const choicesFetcher = async (api: string) => {
  const { data } = await axios(`sonarr${api}`, {
    headers: {
      Authorization: `Bearer ${localStorage.getItem('token')}`,
    },
  })
  return data
}

interface Season {
  seasonNumber: number
  monitored: boolean
}

interface Series {
  title: string
  seasons: Season[]
}

const useSeries = () => {
  const notify = useNotify()
  const { data: series } = useSWR<Series[]>('/series', choicesFetcher, {
    fallbackData: [],
    onError: (e) => {
      console.error(e)
      notify(`Fetch Sonarr series failed: ${e.message}`)
    },
  })
  return series
}

const SeasonChoiceDiv = styled('div')({
  display: 'inline-block',
  verticalAlign: 'middle',
  width: 8,
  height: 8,
  borderRadius: '50%',
  marginRight: 8,
  backgroundColor: 'red',
})

const SeasonChoice = () => {
  const record = useRecordContext<Season>()!
  const { monitored, seasonNumber } = record
  return (
    <div>
      <SeasonChoiceDiv sx={[monitored && { backgroundColor: 'green' }]} />
      {`${seasonNumber}`.padStart(2, '0')}{' '}
    </div>
  )
}

const SeasonsInput = ({ series }: { series: Series[] }) => {
  const seriesTitle = useWatch({ name: 'series', defaultValue: '' })
  const seasonChoices =
    useMemo(
      () =>
        series
          ?.find(({ title }) => title === seriesTitle)
          ?.seasons?.map(({ seasonNumber, monitored }) => ({
            id: `${seasonNumber}`.padStart(2, '0'),
            seasonNumber,
            monitored,
          })),
      [series, seriesTitle]
    ) ?? []

  return <SelectInput source="season" choices={seasonChoices} optionText={<SeasonChoice />} />
}

const RefreshButton = () => {
  const bus = useBus()

  const onClick = useCallback(() => {
    bus?.emit('refresh', null)
  }, [bus])

  return (
    <Button color="primary" onClick={onClick}>
      Refresh
    </Button>
  )
}

const copyToClipboard = (text: string): boolean => {
  // For http context
  const textarea = document.createElement('textarea')
  textarea.value = text

  textarea.style.position = 'fixed'
  textarea.style.opacity = '0'
  document.body.appendChild(textarea)
  textarea.select()

  try {
    // for https context
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text)
      return true
    }

    const result = document.execCommand('copy')
    return result
  } catch (err) {
    console.error('Failed to copy:', err)
    return false
  } finally {
    document.body.removeChild(textarea)
  }
}

const ProxyButton = () => {
  const remote = useWatch({ name: 'remote', defaultValue: '' })
  const notify = useNotify()

  return (
    <Button
      color="primary"
      onClick={async () => {
        if (!remote) {
          notify('No remote link to proxy')
        } else {
          const url = remote.replace(/https?:\/\//, '')
          const proxy = `${location.protocol}//${location.host}${location.pathname}RSS/${url}`
          const success = copyToClipboard(proxy)
          notify(success ? 'Proxied RSS link copied' : 'Failed to copy RSS link')
        }
      }}
    >
      Proxy
    </Button>
  )
}

const TorznabButton = () => {
  const remote = useWatch({ name: 'remote', defaultValue: '' })
  const notify = useNotify()

  return (
    <Button
      color="primary"
      onClick={async () => {
        if (!remote) {
          notify('No remote link for Torznab')
        } else {
          const url = remote.replace(/https?:\/\//, '')
          const torznab = `${location.protocol}//${location.host}${location.pathname}Torznab/${url}`
          const success = copyToClipboard(torznab)
          notify(success ? 'Torznab link copied' : 'Failed to copy Torznab link')
        }
      }}
    >
      Torznab
    </Button>
  )
}

function debounce<T extends (...args: unknown[]) => unknown>(func: T, wait: number, immediate: boolean) {
  let timeout: Timer | null = null
  return function (this: ThisParameterType<T>, ...args: Parameters<T>) {
    clearTimeout(timeout!)
    if (immediate && !timeout) func.apply(this, args)
    timeout = setTimeout(() => {
      timeout = null
      if (!immediate) func.apply(this, args)
    }, wait)
  }
}

const RemoteInput = () => {
  const remote = useWatch({ name: 'remote', defaultValue: '' })
  const bus = useBus()
  const onFetch = useMemo(
    () =>
      debounce(
        (remote) => {
          bus?.setField('url', remote)
        },
        1000,
        false
      ),
    [bus]
  )
  useEffect(() => {
    onFetch(remote)
  }, [remote, onFetch])

  return (
    <TextInput
      fullWidth
      source="remote"
      type="url"
      slotProps={{
        input: {
          endAdornment: (
            <>
              <RefreshButton />
              <ProxyButton />
              <TorznabButton />
            </>
          ),
        },
      }}
    />
  )
}

const PatternInput = () => {
  const notify = useNotify()
  const { setValue } = useFormContext()

  const bus = useBus()
  useEffect(() => {
    if (!bus) return
    const listener = (title: string) => {
      setValue('pattern', title.replace(/[/\-\\^$*+?.()|[\]{}]/g, '\\$&'))
      notify('Replaced pattern with selected item')
    }
    bus.on('item', listener)
    return () => {
      bus.off('item', listener)
    }
  }, [bus, notify, setValue])

  const pattern = useWatch({ name: 'pattern', defaultValue: '' })
  useEffect(() => {
    bus?.setField('pattern', pattern)
  }, [pattern, bus])

  return (
    <TextInput
      multiline
      fullWidth
      source="pattern"
      slotProps={{
        input: {
          endAdornment: (
            <>
              <EscapeButton />
              <Button
                color="primary"
                onClick={() => {
                  const success = copyToClipboard('(?<episode>\\d+)')
                  notify(success ? 'Episode pattern copied' : 'Failed to copy Episode pattern')
                }}
              >
                Episode
              </Button>
              <Button
                color="primary"
                onClick={() => {
                  const success = copyToClipboard('(?<subgroup>.*?)')
                  notify(success ? 'SubGroup pattern copied' : 'Failed to copy SubGroup pattern')
                }}
              >
                Group
              </Button>
            </>
          ),
        },
      }}
      onBlur={() => {}}
    />
  )
}

interface PatternRecord {
  id: string
  remote: string
  pattern: string
  series: string
  season: string
  offset: number
  language: string
  quality: string
}

const PatternEdit = (props: EditProps) => {
  const series = useSeries()
  const choices = useMemo(
    () =>
      series?.map(({ title }) => ({
        id: title,
        name: title,
      })),
    [series]
  )
  if (!series) return null

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
  )
}

const patternDefaultValue = (): Partial<PatternRecord> => ({
  offset: 0,
  language: 'Chinese',
  quality: 'WEBDL 1080p',
})

const PatternCreate = (props: CreateProps) => {
  const series = useSeries()
  const choices = useMemo(
    () =>
      series?.map(({ title }) => ({
        id: title,
        name: title,
      })),
    [series]
  )
  if (!series) return null

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
  )
}

export { PatternCreate, PatternEdit }
