-- Revizzio manual flashcard front images

ALTER TABLE study_project_flashcards
    ADD COLUMN IF NOT EXISTS front_image TEXT;

