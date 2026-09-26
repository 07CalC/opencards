export type DbUser = {
  id: string;
  name: string;
  email: string;
  avatar: string | null;
  provider: string;
  google_sub: string | null;
  created_at: string;
};

export type PublicUser = {
  id: string;
  name: string;
  email: string;
  avatar: string | null;
  provider: string;
  createdAt: string;
};

export type GoogleProfile = {
  name: string;
  avatar: string | null;
  googleSub: string;
};

export type NewGoogleUser = GoogleProfile & {
  email: string;
};

const USER_COLUMNS = "id, name, email, avatar, provider, google_sub, created_at";

export class UserService {
  constructor(private db: D1Database) {}

  findById(id: string): Promise<DbUser | null> {
    return this.db
      .prepare(`SELECT ${USER_COLUMNS} FROM users WHERE id = ?1 LIMIT 1`)
      .bind(id)
      .first<DbUser>();
  }

  findByGoogleSub(googleSub: string): Promise<DbUser | null> {
    return this.db
      .prepare(`SELECT ${USER_COLUMNS} FROM users WHERE google_sub = ?1 LIMIT 1`)
      .bind(googleSub)
      .first<DbUser>();
  }

  findByEmail(email: string): Promise<DbUser | null> {
    return this.db
      .prepare(`SELECT ${USER_COLUMNS} FROM users WHERE email = ?1 LIMIT 1`)
      .bind(email)
      .first<DbUser>();
  }

  /** Look up by google_sub first, falling back to email (accounts created before google_sub existed). */
  async findByGoogleProfile(googleSub: string, email: string): Promise<DbUser | null> {
    return (await this.findByGoogleSub(googleSub)) ?? (await this.findByEmail(email));
  }

  async linkToGoogle(id: string, profile: GoogleProfile): Promise<void> {
    await this.db
      .prepare(
        "UPDATE users SET name = ?1, avatar = ?2, provider = 'google', google_sub = ?3, updated_at = CURRENT_TIMESTAMP WHERE id = ?4",
      )
      .bind(profile.name, profile.avatar, profile.googleSub, id)
      .run();
  }

  async createGoogleUser(input: NewGoogleUser): Promise<DbUser> {
    // OAuth users have no password: `password` is nullable, so store NULL.
    const user = await this.db
      .prepare(
        `INSERT INTO users (name, email, password, avatar, provider, google_sub) VALUES (?1, ?2, NULL, ?3, 'google', ?4) RETURNING ${USER_COLUMNS}`,
      )
      .bind(input.name, input.email, input.avatar, input.googleSub)
      .first<DbUser>();
    if (!user) throw new Error("Failed to create user");
    return user;
  }

  static toPublicUser(user: DbUser): PublicUser {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      provider: user.provider,
      createdAt: user.created_at,
    };
  }
}
