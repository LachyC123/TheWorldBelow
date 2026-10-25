// Generation runs off the main thread; workers return plain data, never engine objects.
import { generateDistrict, type GenRequest } from '../world/generator.ts';

interface Job {
  jobId: number;
  req: GenRequest;
}

self.onmessage = (e: MessageEvent<Job>) => {
  const { jobId, req } = e.data;
  try {
    const res = generateDistrict(req);
    (self as unknown as Worker).postMessage({ jobId, ok: true, res });
  } catch (err) {
    (self as unknown as Worker).postMessage({ jobId, ok: false, error: String(err) });
  }
};
