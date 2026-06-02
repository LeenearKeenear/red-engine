package navigation

import (
	"database/sql"
	"testing"
	"time"

	_ "modernc.org/sqlite"
)

func testTime() time.Time { return time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC) }

func newTestDB(t *testing.T) *sql.DB {
	t.Helper()
	db, err := sql.Open("sqlite", ":memory:")
	if err != nil {
		t.Fatalf("open in-memory db: %v", err)
	}
	t.Cleanup(func() { db.Close() })
	if err := InitNavSchema(db); err != nil {
		t.Fatalf("init schema: %v", err)
	}
	return db
}

func TestInitNavSchema(t *testing.T) {
	db := newTestDB(t)
	for _, table := range []string{"nav_folders", "nav_guides", "nav_description_overrides"} {
		var name string
		err := db.QueryRow(
			`SELECT name FROM sqlite_master WHERE type='table' AND name=?`, table).Scan(&name)
		if err != nil {
			t.Errorf("table %s missing: %v", table, err)
		}
	}
}

func TestInitNavSchemaIdempotent(t *testing.T) {
	db := newTestDB(t)
	if err := InitNavSchema(db); err != nil {
		t.Fatalf("second init failed: %v", err)
	}
}

func TestUpsertAndGetFolder(t *testing.T) {
	db := newTestDB(t)
	s := NewService(db, "")
	id, err := s.upsertFolder(db, "physics", "Physics", "desc", "physics", nil, false)
	if err != nil {
		t.Fatalf("upsert: %v", err)
	}
	got, err := s.GetFolderByID(id)
	if err != nil {
		t.Fatalf("get by id: %v", err)
	}
	if got.Path != "physics" || got.DisplayName != "Physics" {
		t.Errorf("unexpected folder: %+v", got)
	}
}

func TestUpsertFolderIsIdempotent(t *testing.T) {
	db := newTestDB(t)
	s := NewService(db, "")
	id1, _ := s.upsertFolder(db, "physics", "Physics", "", "physics", nil, false)
	id2, _ := s.upsertFolder(db, "physics", "Physics Updated", "", "physics", nil, true)
	if id1 != id2 {
		t.Errorf("expected stable id, got %d then %d", id1, id2)
	}
	got, _ := s.GetFolderByID(id2)
	if got.DisplayName != "Physics Updated" || !got.IsLeaf {
		t.Errorf("update did not apply: %+v", got)
	}
}

func TestGetNavigationFlat(t *testing.T) {
	db := newTestDB(t)
	s := NewService(db, "")
	s.upsertFolder(db, "physics", "Physics", "", "physics", nil, false)
	s.upsertFolder(db, "chemistry", "Chemistry", "", "chemistry", nil, false)

	all, err := s.GetNavigationFlat("", "")
	if err != nil {
		t.Fatalf("flat: %v", err)
	}
	if len(all) != 2 {
		t.Fatalf("expected 2 folders, got %d", len(all))
	}

	filtered, err := s.GetNavigationFlat("", "physics")
	if err != nil {
		t.Fatalf("flat filtered: %v", err)
	}
	if len(filtered) != 1 || filtered[0].Path != "physics" {
		t.Errorf("content_type filter failed: %+v", filtered)
	}
}

func TestGetNavigationTree(t *testing.T) {
	db := newTestDB(t)
	s := NewService(db, "")
	rootID, _ := s.upsertFolder(db, "physics", "Physics", "", "physics", nil, false)
	s.upsertFolder(db, "physics/mechanics", "Mechanics", "", "physics", &rootID, true)

	tree, err := s.GetNavigationTree("physics")
	if err != nil {
		t.Fatalf("tree: %v", err)
	}
	if len(tree.Children) != 1 || tree.Children[0].Path != "physics/mechanics" {
		t.Errorf("tree children wrong: %+v", tree)
	}
}

func TestGetNavigationTreeNotFound(t *testing.T) {
	db := newTestDB(t)
	s := NewService(db, "")
	if _, err := s.GetNavigationTree("nope"); err == nil {
		t.Error("expected error for missing folder")
	}
}

func TestSetFolderDescription(t *testing.T) {
	db := newTestDB(t)
	s := NewService(db, "")
	id, _ := s.upsertFolder(db, "physics", "Physics", "auto desc", "physics", nil, false)
	if err := s.SetFolderDescription(id, "custom desc", "alice"); err != nil {
		t.Fatalf("set description: %v", err)
	}
	got, _ := s.GetFolderByID(id)
	if got.Description != "custom desc" {
		t.Errorf("description not updated: %q", got.Description)
	}
}

func TestUpdateAggregates(t *testing.T) {
	db := newTestDB(t)
	s := NewService(db, "")
	rootID, _ := s.upsertFolder(db, "physics", "Physics", "", "physics", nil, false)
	leafID, _ := s.upsertFolder(db, "physics/mechanics", "Mechanics", "", "physics", &rootID, true)
	s.upsertGuide(db, leafID, "intro.md", "physics/mechanics/intro.md", "Intro", "preview", 10, testTime())

	if err := s.updateAggregates(db); err != nil {
		t.Fatalf("aggregates: %v", err)
	}
	root, _ := s.GetFolderByID(rootID)
	if root.ChildCount != 1 {
		t.Errorf("expected child_count 1, got %d", root.ChildCount)
	}
	leaf, _ := s.GetFolderByID(leafID)
	if leaf.GuideCount != 1 {
		t.Errorf("expected guide_count 1, got %d", leaf.GuideCount)
	}
}
