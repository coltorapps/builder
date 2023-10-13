export type DebounceManager<TResult> = {
  handle(
    key: string,
    callback: () => Promise<TResult> | TResult,
    fallback: () => TResult,
  ): Promise<TResult>;
  get(key: string): Date | undefined;
};

function isTimestampCurrent(
  timestamps: Map<string, Date>,
  key: string,
  timestamp: Date,
): boolean {
  return timestamps.get(key)?.getTime() !== timestamp.getTime();
}

export function createDebounceManager<TResult>(): DebounceManager<TResult> {
  const timestamps: Map<string, Date> = new Map();

  return {
    async handle(key, callback, fallback) {
      const currentTimestamp = new Date();

      timestamps.set(key, currentTimestamp);

      try {
        const result = await callback();

        if (isTimestampCurrent(timestamps, key, currentTimestamp)) {
          return fallback();
        }

        return result;
      } catch (error) {
        throw error;
      } finally {
        if (isTimestampCurrent(timestamps, key, currentTimestamp)) {
          timestamps.delete(key);
        }
      }
    },
    get(key) {
      return timestamps.get(key);
    },
  };
}
