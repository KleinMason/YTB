-- CreateIndex
CREATE UNIQUE INDEX "ytb_entries_user_id_project_id_entry_date_key" ON "ytb_entries"("user_id", "project_id", "entry_date");
