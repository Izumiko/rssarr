import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  FC,
  PropsWithChildren
} from "react";

type EventListener = {
  event: string;
  listener: (arg: any) => void;
};

interface Bus {
  on: <T>(event: string, listener: (arg: T) => void) => void;
  off: <T>(event: string, listener: (arg: T) => void) => void;
  emit: <T>(event: string, arg: T) => void;
  setField: (name: string, value: any) => void;
}

interface BusContextType {
  bus: Bus;
  fields: Record<string, any>;
}

const BusContext = createContext<BusContextType | null>(null);

export const BusProvider: FC<PropsWithChildren> = ({ children }) => {
  const listenersRef = useRef<EventListener[]>([]);
  const on: Bus['on'] = useCallback((event, listener) => {
    listenersRef.current.push({
      event,
      listener,
    });
  }, []);
  const off: Bus['off'] = useCallback((_event, _listener) => {
    const index = listenersRef.current.findIndex(
      ({ event, listener }) => event === _event && listener === _listener
    );
    if (index >= 0) {
      listenersRef.current.splice(index, 1);
    }
  }, []);
  const emit: Bus['emit'] = useCallback((_event, arg) => {
    listenersRef.current
      .filter(({ event }) => event === _event)
      .forEach(({ listener }) => listener?.(arg));
  }, []);
  const [fields, setFields] = useState({});
  const setField: Bus['setField'] = useCallback((name, value) => {
    setFields((fields) => ({
      ...fields,
      [name]: value,
    }));
  }, []);
  const bus = useMemo(
    () => ({
      on,
      off,
      emit,
      setField,
    }),
    [on, off, emit, setField]
  );
  return (
    <BusContext.Provider
      value={{
        bus,
        fields,
      }}
    >
      {children}
    </BusContext.Provider>
  );
};

export const useBus = (): Bus => {
  const context = useContext(BusContext);
  if (!context) {
    throw new Error('useBus must be used within a BusProvider');
  }
  return context.bus;
};

export const useBusField = (name: string) => {
  const context = useContext(BusContext);
  if (!context) {
    throw new Error('useBusField must be used within a BusProvider');
  }
  return context.fields[name];
};
