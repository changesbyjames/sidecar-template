import { useVariable } from '@softwareimaging/backstage';
import { FC, PropsWithChildren, createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Logger, ILogObj } from 'tslog';
import { useLocalStorage } from 'usehooks-ts';
import { Variables } from '../backstage/config';

export const mapLogLevelToAppInsights = (level: number) => {
  /*
    Debug levels:
      App Insights:
        4 - Critical
        3 - Error
        2 - Warning
        1 - Info
        0 - Verbose
  
  
      TSLog:
        6 - Fatal
        5 - Error
        4 - Warn
        3 - Info
        2 - Debug
        1 - Trace
        0 - Silly
  */
  return Math.max(level - 2, 0);
};

interface DebugInfo {
  logger: Logger<ILogObj>;
  level: number;
  debugLevelUntil?: Date;
}

interface DebugActions {
  setLevel: (level: number) => void;
  setDebugLevelUntil: (until?: Date) => void;
}

const useDebugLevel = (): [number, (level: number) => void, Date | undefined, (until?: Date) => void] => {
  const defaultDebugLevel = import.meta.env.DEV ? 3 : 5;
  const backstageDebugLevelVariable = useVariable<Variables>('debugLevel');
  const backstageDebugLevel = backstageDebugLevelVariable ? parseInt(backstageDebugLevelVariable) : undefined;

  const [debugLevelUntil, setTempDebugLevelUntil] = useLocalStorage<string | undefined>(
    'si:debug-level-until',
    undefined
  );
  const [localLevel, setLocalLevel] = useLocalStorage<number>(
    'si:debug-level',
    backstageDebugLevel ?? defaultDebugLevel
  );

  const setDebugLevelUntil = useCallback(
    (until?: Date) => {
      setTempDebugLevelUntil(until?.toISOString());
    },
    [setTempDebugLevelUntil]
  );

  const setLevel = useCallback(
    (level: number) => {
      setLocalLevel(level);
    },
    [setTempDebugLevelUntil]
  );

  if (debugLevelUntil && new Date(debugLevelUntil) > new Date()) {
    return [3, setLevel, debugLevelUntil ? new Date(debugLevelUntil) : undefined, setDebugLevelUntil];
  }
  return [localLevel, setLevel, debugLevelUntil ? new Date(debugLevelUntil) : undefined, setDebugLevelUntil];
};

const DebugContext = createContext<(DebugInfo & DebugActions) | null>(null);
export const DebugProvider: FC<PropsWithChildren> = ({ children }) => {
  const [level, setLevel, debugLevelUntil, setDebugLevelUntil] = useDebugLevel();
  const [logger] = useState<Logger<ILogObj>>(new Logger({ minLevel: level, hideLogPositionForProduction: true }));

  useEffect(() => {
    logger.debug(`Setting debug level to ${level}`);
    logger.settings.minLevel = level;
  }, [logger, level]);

  return (
    <DebugContext.Provider value={{ logger, level, debugLevelUntil, setDebugLevelUntil, setLevel }}>
      {children}
    </DebugContext.Provider>
  );
};

export const useDebug = (namespace: string) => {
  const value = useContext(DebugContext);
  if (!value) throw new Error('useDebug must be used within a DebugProvider');
  const { logger } = value;
  return useMemo(() => logger.getSubLogger({ name: namespace }), [logger, namespace]);
};

export const useLogger = () => {
  const value = useContext(DebugContext);
  if (!value) throw new Error('useLogger must be used within a DebugProvider');
  return value;
};
