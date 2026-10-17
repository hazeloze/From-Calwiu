# EF Player Hub — GitHub Pages + Supabase

A responsive eFootball-inspired player-card library with a private admin login, public player listings, player details, image uploads, and CRUD management. No progression calculator is included.

## Files

- `index.html` — public website and modal shells
- `styles.css` — responsive dark football-card design
- `app.js` — public gallery, Supabase reads, admin login, CRUD and image upload
- `config.js` — your Supabase project URL and anon/publishable key
- `supabase-setup.sql` — database, RLS policies, admin authorization function and Storage policies

## 1. Create your Supabase backend

1. Open [Supabase](https://supabase.com/) and create a project. Save your database password somewhere secure.
2. In the project dashboard, open **SQL Editor → New query**.
3. Open `supabase-setup.sql` from this project, copy all its contents into the SQL editor, and run it.
4. Open **Project Settings → API** (or **Connect**, depending on dashboard layout). Copy the **Project URL** and the **anon/public** key. The public key is intended for browser use; the database is protected by the RLS policies in the SQL file.
5. Open `config.js` and replace `YOUR_SUPABASE_URL` and `YOUR_SUPABASE_ANON_KEY` with your values. Keep the quotation marks. Leave `storageBucket` as `player-images` unless you also change the SQL.

**Never put the `service_role` / secret key into `config.js`, GitHub Pages, or any browser code.** It bypasses database security.

## 2. Create your private admin account

1. In Supabase, go to **Authentication → Users → Add user** (or **Create new user**).
2. Enter the admin email and a strong password. Confirm the user if the dashboard asks you to.
3. Copy the new user's UUID from the Users table.
4. In **SQL Editor**, run the following statement, replacing the example UUID with that user's real UUID:

   ```sql
   insert into public.admin_users (user_id)
   values ('PASTE-AUTH-USER-UUID-HERE');
   ```

5. Do not add anyone else to `admin_users` unless you want them to have administrator access. Do not create a public sign-up form. The website intentionally has no sign-up option.
6. If you want to revoke admin access later, delete that user's row from `public.admin_users`; you can also disable/delete the user in Supabase Authentication.

The admin page checks the authenticated account against `public.is_admin()`. RLS policies also enforce admin access on the database and Storage side; hiding admin controls in the UI is not the security boundary.

## 3. Test locally (optional)

Because the Supabase JavaScript client is loaded from a CDN, test with a local web server rather than opening `index.html` as a file. From this folder, run one of:

```bash
python -m http.server 8000
```

Then open `http://localhost:8000`. Enter your Supabase configuration first. The website should show an empty public library until you add published players through **Admin login**.

## 4. Publish on GitHub Pages

1. Create a new GitHub repository, for example `ef-player-hub`.
2. Upload all project files and folders from this directory to the repository root. Ensure `index.html` is at the root, not nested in another folder.
3. Commit/push the files. Check `config.js` contains your Supabase URL and anon/public key (not the service role key).
4. In the GitHub repository, open **Settings → Pages**.
5. Under **Build and deployment**, choose **Deploy from a branch**, select branch `main` and folder `/(root)`, then save.
6. Wait for the Pages deployment to finish. GitHub will show the website URL, usually `https://YOUR-USERNAME.github.io/ef-player-hub/`.
7. In Supabase, open **Authentication → URL Configuration** and set **Site URL** to the published GitHub Pages URL. Add that same URL to **Redirect URLs** if needed. Password sign-in is used here, but correct site URLs are still useful for auth configuration.

Every time you change frontend files, commit and push them to GitHub. Adding/editing players or images from the admin panel writes directly to Supabase and does not require a new GitHub deployment.

## 5. Using the site

1. Visit your published website and click **Admin login**.
2. Sign in with the admin account you created in Supabase.
3. Click **Add player**. Enter the name and any optional information, choose the player photo and card image, and choose whether to publish the record.
4. Click **Create player**. To change an existing record, use **Edit**. Use **Delete** to permanently delete the record and its stored images.
5. Unpublished players are only visible to signed-in admins; published players appear in the public gallery.

Images must be JPG, PNG, WebP, or GIF and no larger than 5 MB each. Images in the `player-images` bucket are public to view, because visitor browsers need to display player/card photos. Upload, update and delete permissions are restricted to authenticated admin users. Do not upload private or sensitive images.

## Security and limitations

- The frontend uses only the Supabase anon/public key. RLS is the access control layer.
- Only UUIDs registered in `admin_users` are administrators. Admin membership is not managed from the public website.
- The gallery is public; public visitors can read published player records and images. Draft records remain protected by RLS.
- This is a static GitHub Pages app. Supabase is the backend for authentication, database and storage.
- Keep dependencies updated and review Supabase's security/advisor reports from time to time.
- This is an unofficial fan-made project and is not affiliated with KONAMI. Only upload images you have permission to use.

## Troubleshooting

- **“Setup required”**: check `config.js` and ensure it contains the correct project URL and anon/public key.
- **No players / database error**: run `supabase-setup.sql` successfully and check the browser console for the specific error.
- **Login works but admin access is denied**: verify the signed-in user's UUID is in `public.admin_users`.
- **Upload denied**: confirm the admin membership row exists, Storage policies are installed, and the bucket is named `player-images`.
- **Images do not appear**: ensure the Storage bucket is public for reads and the stored image path is present in the player record.
- **Changes not visible after deployment**: hard-refresh the browser and confirm the latest commit deployed on GitHub Pages.
