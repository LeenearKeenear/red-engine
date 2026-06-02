package navigation

import (
	"regexp"
	"strings"
)

var markdownRe = regexp.MustCompile(`\*\*|\*|__|\[.*?\]\(.*?\)|` + "`")

// ExtractFirstParagraph returns the first non-heading paragraph from markdown,
// stripped of inline formatting and capped at 300 characters.
func ExtractFirstParagraph(content string) string {
	var buf []string
	for _, line := range strings.Split(content, "\n") {
		t := strings.TrimSpace(line)
		if strings.HasPrefix(t, "#") {
			continue
		}
		if t == "" {
			if len(buf) > 0 {
				break
			}
			continue
		}
		buf = append(buf, t)
	}
	text := markdownRe.ReplaceAllString(strings.Join(buf, " "), "")
	if len(text) > 300 {
		return text[:300] + "..."
	}
	return text
}

// ExtractFirstHeading returns the text of the first H1 heading in markdown.
func ExtractFirstHeading(content string) string {
	for _, line := range strings.Split(content, "\n") {
		t := strings.TrimSpace(line)
		if strings.HasPrefix(t, "# ") {
			return strings.TrimPrefix(t, "# ")
		}
	}
	return ""
}

// HumanizeFolder converts "classical-mechanics" → "Classical Mechanics".
func HumanizeFolder(name string) string {
	parts := strings.Split(name, "-")
	for i, w := range parts {
		if len(w) > 0 {
			parts[i] = strings.ToUpper(w[:1]) + w[1:]
		}
	}
	return strings.Join(parts, " ")
}

// CountWords counts space-delimited tokens in text.
func CountWords(text string) int {
	return len(strings.Fields(text))
}
