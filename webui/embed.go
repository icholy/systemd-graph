// Package webui embeds the built frontend (the Vite dist output) so it
// can be served from the server binary. Run `pnpm build` before building
// the Go binary so dist exists.
package webui

import (
	"embed"
	"io/fs"
)

//go:embed dist
var dist embed.FS

// Dist returns the embedded frontend rooted at dist (so index.html is at
// the filesystem root).
func Dist() (fs.FS, error) {
	return fs.Sub(dist, "dist")
}
