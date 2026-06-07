// The snapshot is untrusted data; import it as unknown and run it through
// parseGraph rather than trusting an inferred shape.
declare module '*/snapshot.json' {
  const graph: unknown
  export default graph
}
