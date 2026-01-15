-- CreateTable
CREATE TABLE "ytb_entries" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "entry_date" DATE NOT NULL,
    "yesterday_md" TEXT,
    "today_md" TEXT,
    "blockers_md" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ytb_entries_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ytb_entries" ADD CONSTRAINT "ytb_entries_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ytb_entries" ADD CONSTRAINT "ytb_entries_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
