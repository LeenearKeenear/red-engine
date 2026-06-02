package render

import (
	"bytes"
	"crypto/sha256"
	"encoding/hex"
	"strings"

	"github.com/microcosm-cc/bluemonday"
	"github.com/yuin/goldmark"
	gast "github.com/yuin/goldmark/ast"
	"github.com/yuin/goldmark/extension"
	"github.com/yuin/goldmark/parser"
	"github.com/yuin/goldmark/renderer/html"
	"github.com/yuin/goldmark/text"
	"github.com/yuin/goldmark/util"
)

type Result struct {
	HTMLContent string
	Hash        string
}

var sanitizer = func() *bluemonday.Policy {
	p := bluemonday.UGCPolicy()
	p.AllowAttrs("class").OnElements("code", "pre", "span", "div", "p", "li", "input")
	p.AllowAttrs("id").OnElements("h1", "h2", "h3", "h4", "h5", "h6")
	p.AllowAttrs("align").OnElements("td", "th")
	p.AllowAttrs("type", "checked", "disabled", "readonly").OnElements("input")
	p.AllowRelativeURLs(true)
	p.AllowDataURIImages()
	return p
}()

// imageTransformer rewrites bare image filenames to the /-/assets/ route
// so that authors can write ![caption](image.png) without absolute paths.
type imageTransformer struct {
	articleDir string // e.g. "databases/sql" for an article at /databases/sql/select
}

func (t *imageTransformer) Transform(doc *gast.Document, reader text.Reader, pc parser.Context) {
	gast.Walk(doc, func(n gast.Node, entering bool) (gast.WalkStatus, error) {
		if !entering {
			return gast.WalkContinue, nil
		}
		img, ok := n.(*gast.Image)
		if !ok {
			return gast.WalkContinue, nil
		}
		dest := string(img.Destination)
		// Only rewrite bare filenames — leave http(s), absolute, and explicit relative paths alone.
		if dest == "" ||
			strings.HasPrefix(dest, "http://") ||
			strings.HasPrefix(dest, "https://") ||
			strings.HasPrefix(dest, "/") ||
			strings.HasPrefix(dest, "./") ||
			strings.HasPrefix(dest, "../") {
			return gast.WalkContinue, nil
		}
		if t.articleDir != "" {
			img.Destination = []byte("/-/assets/" + t.articleDir + "/" + dest)
		} else {
			img.Destination = []byte("/-/assets/" + dest)
		}
		return gast.WalkContinue, nil
	})
}

func newMD(articleDir string) goldmark.Markdown {
	return goldmark.New(
		goldmark.WithExtensions(
			extension.GFM,
			extension.Table,
			extension.Typographer,
		),
		goldmark.WithParserOptions(
			parser.WithAutoHeadingID(),
			parser.WithASTTransformers(
				util.Prioritized(&imageTransformer{articleDir: articleDir}, 100),
			),
		),
		goldmark.WithRendererOptions(
			html.WithUnsafe(),
		),
	)
}

// Markdown renders src to sanitized HTML. articlePath is the URL path of the
// article (e.g. "databases/sql/select") used to rewrite bare image srcs to
// the /-/assets/ route. Pass an empty string if the path is unknown.
func Markdown(src, articlePath string) (*Result, error) {
	// Derive the directory portion so "image.png" → "/-/assets/databases/sql/image.png".
	articleDir := ""
	if idx := strings.LastIndex(articlePath, "/"); idx >= 0 {
		articleDir = articlePath[:idx]
	}

	sum := sha256.Sum256([]byte(src))
	hash := hex.EncodeToString(sum[:])

	var buf bytes.Buffer
	if err := newMD(articleDir).Convert([]byte(src), &buf); err != nil {
		return nil, err
	}

	return &Result{
		HTMLContent: sanitizer.Sanitize(buf.String()),
		Hash:        hash,
	}, nil
}
