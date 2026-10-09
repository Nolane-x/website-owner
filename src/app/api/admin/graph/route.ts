import { NextResponse } from 'next/server';
import { requireOwner } from '@/lib/auth/guard';
import { getDb, initializeDatabase } from '@/lib/db';
import { contentItems, contentLinks } from '@/lib/db/schema';
import { eq, isNull, inArray, and } from 'drizzle-orm';
import { GraphNode, GraphEdge } from '@/lib/types';

export async function GET() {
  const auth = await requireOwner();
  if (!auth.authorized) return auth.response;

  try {
    await initializeDatabase();
    const db = getDb();

    // 1. Lấy tất cả các nội dung còn hiệu lực
    const items = await db
      .select({
        id: contentItems.id,
        title: contentItems.title,
        slug: contentItems.slug,
        type: contentItems.type,
        description: contentItems.description,
      })
      .from(contentItems)
      .where(
        and(
          eq(contentItems.profileId, auth.profile.id),
          isNull(contentItems.deletedAt)
        )
      );

    if (items.length === 0) {
      return NextResponse.json({ nodes: [], edges: [] });
    }

    const itemIds = items.map((i) => i.id);

    // 2. Lấy tất cả các liên kết giữa các nội dung này
    const links = await db
      .select({
        source: contentLinks.sourceId,
        target: contentLinks.targetId,
        label: contentLinks.linkText,
      })
      .from(contentLinks)
      .where(inArray(contentLinks.sourceId, itemIds));

    // Đếm số lượng kết nối cho mỗi nút
    const connectionCounts: Record<string, number> = {};
    for (const link of links) {
      connectionCounts[link.source] = (connectionCounts[link.source] || 0) + 1;
      connectionCounts[link.target] = (connectionCounts[link.target] || 0) + 1;
    }

    const nodes: GraphNode[] = items.map((item) => ({
      id: item.id,
      title: item.title,
      slug: item.slug,
      type: item.type,
      description: item.description,
      connectionsCount: connectionCounts[item.id] || 0,
    }));

    const edges: GraphEdge[] = links.map((l) => ({
      source: l.source,
      target: l.target,
      label: l.label,
    }));

    return NextResponse.json({ nodes, edges });
  } catch (error) {
    console.error('Lỗi xây dựng bản đồ tri thức:', error);
    return NextResponse.json({ error: 'Không thể tải bản đồ tri thức.' }, { status: 500 });
  }
}
