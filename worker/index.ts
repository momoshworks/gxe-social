export interface Env {
  DB: D1Database;
  ASSETS?: Fetcher;
}

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

function json(data: any, status: number = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      ...corsHeaders,
    },
  });
}

function parseJsonArray(str: any): string[] {
  if (Array.isArray(str)) return str;
  if (!str) return [];
  try {
    const parsed = JSON.parse(str);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    // Only route /api/* to Worker logic; everything else goes to static assets
    if (!url.pathname.startsWith('/api')) {
      if (env.ASSETS) {
        return env.ASSETS.fetch(request);
      }
      return json({ error: 'Not found' }, 404);
    }

    try {
      // 1. Status / Health Check
      if (url.pathname === '/api/status' && request.method === 'GET') {
        return json({
          status: 'online',
          provider: 'Cloudflare D1 + Workers',
          database: 'gxe-db',
          region: 'WEUR',
          timestamp: Date.now(),
        });
      }

      // 2. Feed Posts (الهري)
      if (url.pathname === '/api/posts' && request.method === 'GET') {
        const query = `
          SELECT * FROM posts 
          ORDER BY pinned DESC, createdAt DESC 
          LIMIT 100
        `;
        const { results } = await env.DB.prepare(query).all();
        const posts = (results || []).map((row: any) => ({
          id: row.id,
          author: {
            id: row.authorId,
            name: row.authorName,
            username: row.authorUsername,
            avatar: row.authorAvatar,
            verified: Boolean(row.authorVerified),
          },
          content: row.content,
          mediaUrl: row.mediaUrl || undefined,
          mediaType: row.mediaType || undefined,
          mediaName: row.mediaName || undefined,
          mediaSize: row.mediaSize || undefined,
          createdAt: Number(row.createdAt),
          likes: Number(row.likes) || 0,
          reposts: Number(row.reposts) || 0,
          commentsCount: Number(row.commentsCount) || 0,
          likedBy: parseJsonArray(row.likedBy),
          repostedBy: parseJsonArray(row.repostedBy),
          bookmarkedBy: parseJsonArray(row.bookmarkedBy),
          pinned: Boolean(row.pinned),
        }));
        return json(posts);
      }

      if (url.pathname === '/api/posts' && request.method === 'POST') {
        const body: any = await request.json();
        const id = body.id || 'post_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
        const author = body.author || {};
        const createdAt = body.createdAt || Date.now();

        await env.DB.prepare(`
          INSERT INTO posts (
            id, authorId, authorName, authorUsername, authorAvatar, authorVerified,
            content, mediaUrl, mediaType, mediaName, mediaSize, createdAt,
            likes, reposts, commentsCount, likedBy, repostedBy, bookmarkedBy, pinned
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            content = excluded.content,
            mediaUrl = excluded.mediaUrl,
            mediaType = excluded.mediaType
        `).bind(
          id,
          author.id || 'anonymous',
          author.name || 'مستخدم GXE',
          author.username || 'user',
          author.avatar || '',
          author.verified ? 1 : 0,
          body.content || '',
          body.mediaUrl || null,
          body.mediaType || null,
          body.mediaName || null,
          body.mediaSize || null,
          createdAt,
          body.likes || 0,
          body.reposts || 0,
          body.commentsCount || 0,
          JSON.stringify(body.likedBy || []),
          JSON.stringify(body.repostedBy || []),
          JSON.stringify(body.bookmarkedBy || []),
          body.pinned ? 1 : 0
        ).run();

        // Also ensure author exists in users table
        if (author.id) {
          await env.DB.prepare(`
            INSERT INTO users (id, name, username, avatar, verified, createdAt)
            VALUES (?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
              name = excluded.name,
              username = excluded.username,
              avatar = excluded.avatar
          `).bind(
            author.id,
            author.name || 'مستخدم GXE',
            author.username || 'user',
            author.avatar || '',
            author.verified ? 1 : 0,
            Date.now()
          ).run();
        }

        return json({ success: true, id });
      }

      // Delete Post
      const deleteMatch = url.pathname.match(/^\/api\/posts\/([^/]+)$/);
      if (deleteMatch && request.method === 'DELETE') {
        const postId = deleteMatch[1];
        await env.DB.batch([
          env.DB.prepare('DELETE FROM posts WHERE id = ?').bind(postId),
          env.DB.prepare('DELETE FROM comments WHERE postId = ?').bind(postId),
        ]);
        return json({ success: true, postId });
      }

      // Like Post
      const likeMatch = url.pathname.match(/^\/api\/posts\/([^/]+)\/like$/);
      if (likeMatch && request.method === 'POST') {
        const postId = likeMatch[1];
        const { userId } = (await request.json()) as any;

        const postRow: any = await env.DB.prepare('SELECT likes, likedBy FROM posts WHERE id = ?').bind(postId).first();
        if (!postRow) return json({ error: 'Post not found' }, 404);

        let likedBy = parseJsonArray(postRow.likedBy);
        let likes = Number(postRow.likes) || 0;
        let isLiked = likedBy.includes(userId);

        if (isLiked) {
          likedBy = likedBy.filter((id) => id !== userId);
          likes = Math.max(0, likes - 1);
        } else {
          likedBy.push(userId);
          likes += 1;
        }

        await env.DB.prepare('UPDATE posts SET likes = ?, likedBy = ? WHERE id = ?')
          .bind(likes, JSON.stringify(likedBy), postId)
          .run();

        return json({ success: true, likes, likedBy, isLiked: !isLiked });
      }

      // Repost Post
      const repostMatch = url.pathname.match(/^\/api\/posts\/([^/]+)\/repost$/);
      if (repostMatch && request.method === 'POST') {
        const postId = repostMatch[1];
        const { userId } = (await request.json()) as any;

        const postRow: any = await env.DB.prepare('SELECT reposts, repostedBy FROM posts WHERE id = ?').bind(postId).first();
        if (!postRow) return json({ error: 'Post not found' }, 404);

        let repostedBy = parseJsonArray(postRow.repostedBy);
        let reposts = Number(postRow.reposts) || 0;
        let isReposted = repostedBy.includes(userId);

        if (isReposted) {
          repostedBy = repostedBy.filter((id) => id !== userId);
          reposts = Math.max(0, reposts - 1);
        } else {
          repostedBy.push(userId);
          reposts += 1;
        }

        await env.DB.prepare('UPDATE posts SET reposts = ?, repostedBy = ? WHERE id = ?')
          .bind(reposts, JSON.stringify(repostedBy), postId)
          .run();

        return json({ success: true, reposts, repostedBy, isReposted: !isReposted });
      }

      // Bookmark Post
      const bookmarkMatch = url.pathname.match(/^\/api\/posts\/([^/]+)\/bookmark$/);
      if (bookmarkMatch && request.method === 'POST') {
        const postId = bookmarkMatch[1];
        const { userId } = (await request.json()) as any;

        const postRow: any = await env.DB.prepare('SELECT bookmarkedBy FROM posts WHERE id = ?').bind(postId).first();
        if (!postRow) return json({ error: 'Post not found' }, 404);

        let bookmarkedBy = parseJsonArray(postRow.bookmarkedBy);
        let isBookmarked = bookmarkedBy.includes(userId);

        if (isBookmarked) {
          bookmarkedBy = bookmarkedBy.filter((id) => id !== userId);
        } else {
          bookmarkedBy.push(userId);
        }

        await env.DB.prepare('UPDATE posts SET bookmarkedBy = ? WHERE id = ?')
          .bind(JSON.stringify(bookmarkedBy), postId)
          .run();

        return json({ success: true, bookmarkedBy, isBookmarked: !isBookmarked });
      }

      // 3. Comments (الهاري)
      const commentsMatch = url.pathname.match(/^\/api\/posts\/([^/]+)\/comments$/);
      if (commentsMatch && request.method === 'GET') {
        const postId = commentsMatch[1];
        const { results } = await env.DB.prepare(`
          SELECT * FROM comments WHERE postId = ? ORDER BY createdAt ASC
        `).bind(postId).all();

        const comments = (results || []).map((row: any) => ({
          id: row.id,
          postId: row.postId,
          author: {
            id: row.authorId,
            name: row.authorName,
            username: row.authorUsername,
            avatar: row.authorAvatar,
            verified: Boolean(row.authorVerified),
          },
          text: row.text,
          createdAt: Number(row.createdAt),
          likes: Number(row.likes) || 0,
          likedBy: parseJsonArray(row.likedBy),
        }));
        return json(comments);
      }

      if (commentsMatch && request.method === 'POST') {
        const postId = commentsMatch[1];
        const body: any = await request.json();
        const id = body.id || 'comment_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
        const author = body.author || {};
        const createdAt = body.createdAt || Date.now();

        await env.DB.batch([
          env.DB.prepare(`
            INSERT INTO comments (
              id, postId, authorId, authorName, authorUsername, authorAvatar, authorVerified,
              text, createdAt, likes, likedBy
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).bind(
            id,
            postId,
            author.id || 'anonymous',
            author.name || 'مستخدم GXE',
            author.username || 'user',
            author.avatar || '',
            author.verified ? 1 : 0,
            body.text || '',
            createdAt,
            0,
            '[]'
          ),
          env.DB.prepare('UPDATE posts SET commentsCount = commentsCount + 1 WHERE id = ?').bind(postId),
        ]);

        return json({
          id,
          postId,
          author,
          text: body.text || '',
          createdAt,
          likes: 0,
          likedBy: [],
        });
      }

      // 4. Users & Authentication
      if (url.pathname === '/api/users' && request.method === 'GET') {
        const { results } = await env.DB.prepare('SELECT id, name, username, avatar, bio, verified, followersCount, followingCount, createdAt FROM users ORDER BY createdAt DESC LIMIT 50').all();
        const users = (results || []).map((row: any) => ({
          id: row.id,
          name: row.name,
          username: row.username,
          avatar: row.avatar,
          bio: row.bio || undefined,
          verified: Boolean(row.verified),
          followersCount: Number(row.followersCount) || 0,
          followingCount: Number(row.followingCount) || 0,
          createdAt: Number(row.createdAt),
        }));
        return json(users);
      }

      const userMatch = url.pathname.match(/^\/api\/users\/([^/]+)$/);
      if (userMatch && request.method === 'GET') {
        const userId = userMatch[1];
        const userRow: any = await env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(userId).first();
        if (!userRow) return json({ error: 'User not found' }, 404);

        // Fetch following IDs
        const { results: followingRows } = await env.DB.prepare('SELECT followingId FROM follows WHERE followerId = ?').bind(userId).all();
        const { results: followerRows } = await env.DB.prepare('SELECT followerId FROM follows WHERE followingId = ?').bind(userId).all();

        const following = (followingRows || []).map((r: any) => r.followingId);
        const followers = (followerRows || []).map((r: any) => r.followerId);

        return json({
          id: userRow.id,
          name: userRow.name,
          username: userRow.username,
          avatar: userRow.avatar,
          coverUrl: userRow.coverUrl || undefined,
          bio: userRow.bio || undefined,
          verified: Boolean(userRow.verified),
          email: userRow.email || undefined,
          following,
          followers,
          followingCount: following.length || Number(userRow.followingCount) || 0,
          followersCount: followers.length || Number(userRow.followersCount) || 0,
          createdAt: Number(userRow.createdAt),
        });
      }

      // User Sync (UPSERT Profile)
      if (url.pathname === '/api/users/sync' && request.method === 'POST') {
        const user: any = await request.json();
        if (!user.id) return json({ error: 'User ID is required' }, 400);

        await env.DB.prepare(`
          INSERT INTO users (
            id, name, username, avatar, coverUrl, bio, verified, email, createdAt
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            name = COALESCE(excluded.name, users.name),
            username = COALESCE(excluded.username, users.username),
            avatar = COALESCE(excluded.avatar, users.avatar),
            coverUrl = COALESCE(excluded.coverUrl, users.coverUrl),
            bio = COALESCE(excluded.bio, users.bio),
            verified = COALESCE(excluded.verified, users.verified),
            email = COALESCE(excluded.email, users.email)
        `).bind(
          user.id,
          user.name || 'مستخدم GXE',
          user.username || 'user',
          user.avatar || '',
          user.coverUrl || null,
          user.bio || null,
          user.verified ? 1 : 0,
          user.email || null,
          user.createdAt || Date.now()
        ).run();

        return json({ success: true, user });
      }

      // Follow / Unfollow User
      const followMatch = url.pathname.match(/^\/api\/users\/([^/]+)\/follow$/);
      if (followMatch && request.method === 'POST') {
        const targetUserId = followMatch[1];
        const { followerId } = (await request.json()) as any;
        if (!followerId || followerId === targetUserId) {
          return json({ error: 'Invalid follower or target ID' }, 400);
        }

        const existing: any = await env.DB.prepare('SELECT 1 FROM follows WHERE followerId = ? AND followingId = ?')
          .bind(followerId, targetUserId)
          .first();

        let isFollowing = false;
        if (existing) {
          // Unfollow
          await env.DB.batch([
            env.DB.prepare('DELETE FROM follows WHERE followerId = ? AND followingId = ?').bind(followerId, targetUserId),
            env.DB.prepare('UPDATE users SET followingCount = MAX(0, followingCount - 1) WHERE id = ?').bind(followerId),
            env.DB.prepare('UPDATE users SET followersCount = MAX(0, followersCount - 1) WHERE id = ?').bind(targetUserId),
          ]);
          isFollowing = false;
        } else {
          // Follow
          await env.DB.batch([
            env.DB.prepare('INSERT INTO follows (followerId, followingId, createdAt) VALUES (?, ?, ?)').bind(followerId, targetUserId, Date.now()),
            env.DB.prepare('UPDATE users SET followingCount = followingCount + 1 WHERE id = ?').bind(followerId),
            env.DB.prepare('UPDATE users SET followersCount = followersCount + 1 WHERE id = ?').bind(targetUserId),
          ]);
          isFollowing = true;
        }

        return json({ success: true, isFollowing });
      }

      // 5. Direct Messages (DMs)
      const chatMatch = url.pathname.match(/^\/api\/messages\/([^/]+)$/);
      if (chatMatch && request.method === 'GET') {
        const chatId = chatMatch[1];
        const { results } = await env.DB.prepare('SELECT * FROM messages WHERE chatId = ? ORDER BY createdAt ASC').bind(chatId).all();
        const messages = (results || []).map((row: any) => ({
          id: row.id,
          chatId: row.chatId,
          senderId: row.senderId,
          receiverId: row.receiverId,
          senderName: row.senderName || undefined,
          senderAvatar: row.senderAvatar || undefined,
          text: row.text,
          mediaUrl: row.mediaUrl || undefined,
          mediaType: row.mediaType || undefined,
          createdAt: Number(row.createdAt),
          read: Boolean(row.read),
        }));
        return json(messages);
      }

      if (url.pathname === '/api/messages' && request.method === 'POST') {
        const body: any = await request.json();
        const id = body.id || 'msg_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
        const createdAt = body.createdAt || Date.now();

        await env.DB.prepare(`
          INSERT INTO messages (
            id, chatId, senderId, receiverId, senderName, senderAvatar,
            text, mediaUrl, mediaType, createdAt, read
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
          id,
          body.chatId,
          body.senderId,
          body.receiverId,
          body.senderName || null,
          body.senderAvatar || null,
          body.text || '',
          body.mediaUrl || null,
          body.mediaType || null,
          createdAt,
          0
        ).run();

        return json({ success: true, id, ...body, createdAt });
      }

      // 6. Notifications
      const notifMatch = url.pathname.match(/^\/api\/notifications\/([^/]+)$/);
      if (notifMatch && request.method === 'GET') {
        const userId = notifMatch[1];
        const { results } = await env.DB.prepare('SELECT * FROM notifications WHERE userId = ? ORDER BY createdAt DESC LIMIT 50').bind(userId).all();
        const notifications = (results || []).map((row: any) => ({
          id: row.id,
          userId: row.userId,
          senderId: row.senderId,
          senderName: row.senderName,
          senderUsername: row.senderUsername || undefined,
          senderAvatar: row.senderAvatar || undefined,
          type: row.type,
          content: row.content,
          postId: row.postId || undefined,
          createdAt: Number(row.createdAt),
          read: Boolean(row.read),
        }));
        return json(notifications);
      }

      if (url.pathname === '/api/notifications' && request.method === 'POST') {
        const body: any = await request.json();
        const id = body.id || 'notif_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
        const createdAt = body.createdAt || Date.now();

        await env.DB.prepare(`
          INSERT INTO notifications (
            id, userId, senderId, senderName, senderUsername, senderAvatar,
            type, content, postId, createdAt, read
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
          id,
          body.userId,
          body.senderId,
          body.senderName || '',
          body.senderUsername || null,
          body.senderAvatar || null,
          body.type,
          body.content,
          body.postId || null,
          createdAt,
          0
        ).run();

        return json({ success: true, id });
      }

      const notifReadMatch = url.pathname.match(/^\/api\/notifications\/([^/]+)\/read$/);
      if (notifReadMatch && request.method === 'POST') {
        const userId = notifReadMatch[1];
        await env.DB.prepare('UPDATE notifications SET read = 1 WHERE userId = ?').bind(userId).run();
        return json({ success: true });
      }

      // 7. Media Upload Endpoint
      if (url.pathname === '/api/upload' && request.method === 'POST') {
        const body: any = await request.json();
        return json({
          success: true,
          url: body.dataUrl || body.url,
          name: body.name || 'media',
          size: body.size || '10 KB',
          type: body.type || 'image',
        });
      }

      return json({ error: 'Endpoint not found' }, 404);
    } catch (error: any) {
      console.error('API Error:', error);
      return json({ error: error.message || 'Internal Server Error' }, 500);
    }
  },
};
