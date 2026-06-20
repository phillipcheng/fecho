/**
 * Path expression parser.
 *
 * echo paths address a value inside a JSON document using `->` separated
 * segments, mirroring Nario's feature-path language:
 *
 *   data->page_size                       leaf object key
 *   data                                  non-leaf key (selects the subtree)
 *   data->task_list->[*]->task_mode       any array element
 *   data->task_list->[0]->task_mode       a specific array index
 *   Arguments->1->reqs->*->buyer_region   any dynamic map key (`*`)
 *   data->^[0-9]$->v                      map keys matching a /^[0-9]$/ regex
 *
 * Note: a bare numeric token (`1`) is an *object key*; `[1]` is an *array index*.
 */

export type Segment =
  | { kind: "key"; key: string }
  | { kind: "index"; index: number }
  | { kind: "anyIndex" }
  | { kind: "anyKey" }
  | { kind: "regexKey"; source: string; re: RegExp };

export const PATH_SEPARATOR = "->";

export class PathParseError extends Error {
  constructor(
    message: string,
    readonly path: string,
  ) {
    super(`${message} (in path "${path}")`);
    this.name = "PathParseError";
  }
}

const INDEX_RE = /^\[(\d+)\]$/;

function parseSegment(token: string, path: string): Segment {
  const t = token.trim();
  if (t === "") {
    throw new PathParseError("empty path segment", path);
  }
  if (t === "[*]") {
    return { kind: "anyIndex" };
  }
  const indexMatch = INDEX_RE.exec(t);
  if (indexMatch) {
    return { kind: "index", index: Number(indexMatch[1]) };
  }
  if (t === "*") {
    return { kind: "anyKey" };
  }
  if (t.length >= 2 && t.startsWith("^") && t.endsWith("$")) {
    try {
      return { kind: "regexKey", source: t, re: new RegExp(t) };
    } catch (err) {
      throw new PathParseError(
        `invalid regex key segment "${t}": ${(err as Error).message}`,
        path,
      );
    }
  }
  return { kind: "key", key: t };
}

/** Parse a path expression into segments. Throws PathParseError when malformed. */
export function parsePath(path: string): Segment[] {
  if (path.trim() === "") {
    throw new PathParseError("path is empty", path);
  }
  return path.split(PATH_SEPARATOR).map((token) => parseSegment(token, path));
}
