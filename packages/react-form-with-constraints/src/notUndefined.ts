// See "TypeScript static analysis is unable to track this behavior" https://codereview.stackexchange.com/a/138289/148847
// See TypeScript filter out nulls from an array https://stackoverflow.com/q/43118692
export default function notUndefined<T>(value: T | undefined): value is T {
  return value !== undefined;
}
