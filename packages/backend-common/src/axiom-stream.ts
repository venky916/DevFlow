import { Axiom } from '@axiomhq/js';

interface AxiomStreamOptions {
  token: string;
  dataset: string;
}

export interface AxiomStream {
  write(line: string): void;
  flush(): Promise<void>;
}

// A destination for pino that sends every log line to an Axiom dataset.
// It must never throw: a failing log service may not break the app.
export function createAxiomStream({ token, dataset }: AxiomStreamOptions): AxiomStream {
  const client = new Axiom({
    token,
    // no console in the backend, and a failing log service must not stop the app
    onError: (err) => {
      const reason = err instanceof Error ? err.message : String(err);
      process.stderr.write(`[axiom] could not send logs: ${reason}\n`);
    },
  });

  return {
    write(line) {
      try {
        // pino writes "time"; Axiom reads "_time"
        const { time, ...event } = JSON.parse(line) as Record<string, unknown>;
        client.ingest(dataset, [{ _time: time, ...event }]);
      } catch {
        // a line that is not valid JSON is skipped
      }
    },
    async flush() {
      try {
        await client.flush();
      } catch {
        // nothing more can be done
      }
    },
  };
}
