import { readStore, updateStore } from "./store.js";
import { authorSummary, getUserByUsername, toListItem } from "./demo-data.js";
import { sendNewCaseStudyEmail } from "./mail.js";

export function normalizeStore(store) {
  return {
    ...store,
    follows: store.follows || [],
    comments: store.comments || [],
    notifications: store.notifications || [],
  };
}

function nextId(items) {
  return items.reduce((max, item) => Math.max(max, item.id || 0), 0) + 1;
}

function searchableText(...parts) {
  return parts
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

export async function getFollowStats(userId, viewerId = null) {
  const store = normalizeStore(await readStore());
  const followerCount = store.follows.filter((f) => f.following_id === userId).length;
  const followingCount = store.follows.filter((f) => f.follower_id === userId).length;
  const isFollowing =
    viewerId != null
      ? store.follows.some((f) => f.follower_id === viewerId && f.following_id === userId)
      : false;
  return { follower_count: followerCount, following_count: followingCount, is_following: isFollowing };
}

export async function followUser(followerId, username) {
  const target = await getUserByUsername(username);
  if (!target) return { error: "User not found", status: 404 };
  if (target.id === followerId) return { error: "You cannot follow yourself", status: 400 };

  await updateStore((store) => {
    const normalized = normalizeStore(store);
    const exists = normalized.follows.some(
      (f) => f.follower_id === followerId && f.following_id === target.id,
    );
    if (!exists) {
      normalized.follows.push({
        follower_id: followerId,
        following_id: target.id,
        created_at: new Date().toISOString(),
      });
    }
    return normalized;
  });

  return { ok: true, user_id: target.id, username: target.username };
}

export async function unfollowUser(followerId, username) {
  const target = await getUserByUsername(username);
  if (!target) return { error: "User not found", status: 404 };

  await updateStore((store) => {
    const normalized = normalizeStore(store);
    normalized.follows = normalized.follows.filter(
      (f) => !(f.follower_id === followerId && f.following_id === target.id),
    );
    return normalized;
  });

  return { ok: true };
}

export async function listFollowing(userId) {
  const store = normalizeStore(await readStore());
  const followingIds = store.follows
    .filter((f) => f.follower_id === userId)
    .map((f) => f.following_id);
  return store.users
    .filter((u) => followingIds.includes(u.id))
    .map((u) => authorSummary(u));
}

export async function getFollowingFeed(userId) {
  const store = normalizeStore(await readStore());
  const followingIds = new Set(
    store.follows.filter((f) => f.follower_id === userId).map((f) => f.following_id),
  );

  return store.caseStudies
    .filter((cs) => cs.status === "published" && followingIds.has(cs.author_id))
    .sort((a, b) => new Date(b.published_at) - new Date(a.published_at))
    .map((cs) => {
      const author = store.users.find((u) => u.id === cs.author_id);
      return {
        ...toListItem(cs),
        published_at: cs.published_at,
        author: author ? authorSummary(author) : null,
      };
    });
}

export async function listComments(caseStudyId) {
  const store = normalizeStore(await readStore());
  return store.comments
    .filter((c) => c.case_study_id === caseStudyId)
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
    .map((c) => {
      const author = store.users.find((u) => u.id === c.author_id);
      return {
        id: c.id,
        case_study_id: c.case_study_id,
        body: c.body,
        created_at: c.created_at,
        author: author ? authorSummary(author) : null,
      };
    });
}

export async function addComment(caseStudyId, authorId, body) {
  const text = String(body || "").trim();
  if (!text) return { error: "Comment cannot be empty", status: 400 };
  if (text.length > 2000) return { error: "Comment is too long (max 2000 characters)", status: 400 };

  const store = await readStore();
  const study = store.caseStudies.find((cs) => cs.id === caseStudyId && cs.status === "published");
  if (!study) return { error: "Case study not found", status: 404 };

  let created = null;
  await updateStore((s) => {
    const normalized = normalizeStore(s);
    const id = nextId(normalized.comments);
    created = {
      id,
      case_study_id: caseStudyId,
      author_id: authorId,
      body: text,
      created_at: new Date().toISOString(),
    };
    normalized.comments.push(created);
    return normalized;
  });

  const author = store.users.find((u) => u.id === authorId);
  const studyAuthor = store.users.find((u) => u.id === study.author_id);
  if (study.author_id !== authorId) {
    await createNotification({
      userId: study.author_id,
      type: "comment",
      title: "New feedback on your case study",
      message: `${author?.name || "Someone"} commented on "${study.title}"`,
      link: `/u/${studyAuthor?.username}/${study.slug}`,
    });
  }

  return {
    id: created.id,
    case_study_id: created.case_study_id,
    body: created.body,
    created_at: created.created_at,
    author: author ? authorSummary(author) : null,
    study_author_username: studyAuthor?.username,
    study_slug: study.slug,
  };
}

export async function deleteComment(commentId, userId) {
  await updateStore((store) => {
    const normalized = normalizeStore(store);
    const comment = normalized.comments.find((c) => c.id === commentId);
    if (!comment) throw new Error("Comment not found");
    if (comment.author_id !== userId) throw new Error("Forbidden");
    normalized.comments = normalized.comments.filter((c) => c.id !== commentId);
    return normalized;
  });
}

export async function createNotification({ userId, type, title, message, link }) {
  let notification = null;
  await updateStore((store) => {
    const normalized = normalizeStore(store);
    notification = {
      id: nextId(normalized.notifications),
      user_id: userId,
      type,
      title,
      message,
      link: link || null,
      read_at: null,
      created_at: new Date().toISOString(),
    };
    normalized.notifications.push(notification);
    return normalized;
  });
  return notification;
}

export async function listNotifications(userId, { limit = 50 } = {}) {
  const store = normalizeStore(await readStore());
  return store.notifications
    .filter((n) => n.user_id === userId)
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, limit);
}

export async function getUnreadNotificationCount(userId) {
  const store = normalizeStore(await readStore());
  return store.notifications.filter((n) => n.user_id === userId && !n.read_at).length;
}

export async function markNotificationsRead(userId, ids = null) {
  const now = new Date().toISOString();
  await updateStore((store) => {
    const normalized = normalizeStore(store);
    normalized.notifications = normalized.notifications.map((n) => {
      if (n.user_id !== userId) return n;
      if (ids && !ids.includes(n.id)) return n;
      if (!n.read_at) return { ...n, read_at: now };
      return n;
    });
    return normalized;
  });
}

export async function notifyNewPublication(caseStudy, author) {
  const store = normalizeStore(await readStore());
  const studyUrl = `/u/${author.username}/${caseStudy.slug}`;
  const appBase = (process.env.APP_BASE_URL || "https://uxguard-portfolio.vercel.app").replace(/\/$/, "");
  const absoluteUrl = `${appBase}${studyUrl}`;

  const recipients = store.users.filter((u) => u.id !== author.id);

  for (const recipient of recipients) {
    await createNotification({
      userId: recipient.id,
      type: "new_case_study",
      title: "New case study published",
      message: `${author.name} published "${caseStudy.title}"`,
      link: studyUrl,
    });

    if (recipient.email && process.env.RESEND_API_KEY) {
      try {
        await sendNewCaseStudyEmail({
          to: recipient.email,
          userName: recipient.name,
          authorName: author.name,
          studyTitle: caseStudy.title,
          studyUrl: absoluteUrl,
        });
      } catch {
        // Portal notification still delivered; email is best-effort.
      }
    }
  }
}

export async function searchPlatform(query) {
  const q = String(query || "").trim().toLowerCase();
  if (!q || q.length < 2) {
    return { query: q, users: [], case_studies: [] };
  }

  const store = normalizeStore(await readStore());

  const users = store.users
    .filter((u) => {
      const haystack = searchableText(u.name, u.username, u.title, u.bio, u.location);
      return haystack.includes(q);
    })
    .slice(0, 12)
    .map((u) => ({
      ...authorSummary(u),
      title: u.title || null,
      bio: u.bio || null,
      portfolio_url: `/u/${u.username}`,
    }));

  const caseStudies = store.caseStudies
    .filter((cs) => cs.status === "published")
    .filter((cs) => {
      const haystack = searchableText(
        cs.title,
        cs.subtitle,
        cs.summary,
        cs.client,
        cs.project_type,
        cs.role,
        cs.challenge,
        cs.methodology,
        cs.impact,
        cs.reflections,
        ...(cs.methods || []),
      );
      return haystack.includes(q);
    })
    .slice(0, 24)
    .map((cs) => {
      const author = store.users.find((u) => u.id === cs.author_id);
      return {
        ...toListItem(cs),
        published_at: cs.published_at,
        author: author ? authorSummary(author) : null,
        url: author ? `/u/${author.username}/${cs.slug}` : null,
      };
    });

  return { query: q, users, case_studies: caseStudies };
}
