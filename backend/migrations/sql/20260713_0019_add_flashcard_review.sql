-- Revizzio flashcard "marked for review" flag

ALTER TABLE study_project_flashcards
    ADD COLUMN IF NOT EXISTS review BOOLEAN NOT NULL DEFAULT false;
