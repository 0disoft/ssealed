import { ScaffoldInterruptedError, type ScaffoldSignalName } from "./errors.js";

const scaffoldSignals = ["SIGINT", "SIGTERM"] as const satisfies readonly ScaffoldSignalName[];

export interface ScaffoldInterruptContext {
  readonly interruptedSignal: ScaffoldSignalName | undefined;
  isInterrupted(): boolean;
  throwIfInterrupted(): void;
}

class ActiveScaffoldInterruptContext implements ScaffoldInterruptContext {
  #interruptedSignal: ScaffoldSignalName | undefined;

  get interruptedSignal(): ScaffoldSignalName | undefined {
    return this.#interruptedSignal;
  }

  interrupt(signal: ScaffoldSignalName): void {
    this.#interruptedSignal ??= signal;
  }

  isInterrupted(): boolean {
    return this.#interruptedSignal !== undefined;
  }

  throwIfInterrupted(): void {
    if (this.#interruptedSignal !== undefined) {
      throw new ScaffoldInterruptedError(this.#interruptedSignal);
    }
  }
}

let activeContext: ActiveScaffoldInterruptContext | undefined;

export function getScaffoldInterruptContext(): ScaffoldInterruptContext | undefined {
  return activeContext;
}

export async function withScaffoldSignalHandling<T>(task: () => Promise<T>): Promise<T> {
  if (activeContext !== undefined) {
    return task();
  }

  const context = new ActiveScaffoldInterruptContext();
  const handlers = scaffoldSignals.map((signal) => {
    const handler = (): void => {
      context.interrupt(signal);
    };
    process.once(signal, handler);
    return { signal, handler };
  });

  activeContext = context;
  try {
    const result = await task();
    context.throwIfInterrupted();
    return result;
  } finally {
    for (const { signal, handler } of handlers) {
      process.removeListener(signal, handler);
    }
    activeContext = undefined;
  }
}
