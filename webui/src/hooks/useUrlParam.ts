import { useCallback, useEffect, useState } from 'react'

function read(key: string): string | null {
  return new URLSearchParams(window.location.search).get(key)
}

// useUrlParam keeps a string value in sync with a URL query parameter.
// Setting it pushes a history entry (so the browser back button works);
// back/forward navigation updates the value via popstate.
export function useUrlParam(key: string): [string | null, (v: string | null) => void] {
  const [value, setValue] = useState<string | null>(() => read(key))

  useEffect(() => {
    const onPop = () => setValue(read(key))
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [key])

  const set = useCallback(
    (v: string | null) => {
      setValue(v)
      const params = new URLSearchParams(window.location.search)
      if (v === null) {
        params.delete(key)
      } else {
        params.set(key, v)
      }
      const qs = params.toString()
      window.history.pushState(null, '', qs ? `?${qs}` : window.location.pathname)
    },
    [key],
  )

  return [value, set]
}
