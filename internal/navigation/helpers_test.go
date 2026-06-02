package navigation

import "testing"

func TestExtractFirstParagraph(t *testing.T) {
	in := "# Title\n\nThis is the **first** paragraph.\n\nSecond paragraph."
	got := ExtractFirstParagraph(in)
	want := "This is the first paragraph."
	if got != want {
		t.Errorf("got %q, want %q", got, want)
	}
}

func TestExtractFirstParagraphSkipsHeading(t *testing.T) {
	in := "## Heading only\n# Another\n\nBody text here."
	got := ExtractFirstParagraph(in)
	want := "Body text here."
	if got != want {
		t.Errorf("got %q, want %q", got, want)
	}
}

func TestExtractFirstParagraphTruncates(t *testing.T) {
	long := ""
	for i := 0; i < 400; i++ {
		long += "a"
	}
	got := ExtractFirstParagraph(long)
	if len(got) != 303 { // 300 chars + "..."
		t.Errorf("expected truncation to 303 chars, got %d", len(got))
	}
}

func TestExtractFirstHeading(t *testing.T) {
	in := "Some intro\n# Real Heading\nmore"
	got := ExtractFirstHeading(in)
	want := "Real Heading"
	if got != want {
		t.Errorf("got %q, want %q", got, want)
	}
}

func TestHumanizeFolder(t *testing.T) {
	cases := map[string]string{
		"classical-mechanics": "Classical Mechanics",
		"physics":             "Physics",
		"a-b-c":               "A B C",
	}
	for in, want := range cases {
		if got := HumanizeFolder(in); got != want {
			t.Errorf("HumanizeFolder(%q) = %q, want %q", in, got, want)
		}
	}
}

func TestCountWords(t *testing.T) {
	if got := CountWords("one two three"); got != 3 {
		t.Errorf("got %d, want 3", got)
	}
	if got := CountWords("   "); got != 0 {
		t.Errorf("got %d, want 0", got)
	}
}
