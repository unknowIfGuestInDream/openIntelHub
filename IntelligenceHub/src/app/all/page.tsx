import { loadNews } from '@/lib/data';
import { NewsExplorer } from '@/components/NewsExplorer';

export default async function AllNewsPage() {
  const data = await loadNews();
  // Newest first so search/pagination presents the freshest articles up top.
  const items = [...data.items].sort((a, b) =>
    b.publishedAt.localeCompare(a.publishedAt),
  );

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold text-slate-100">全部新闻</h1>
        <p className="mt-2 text-sm text-slate-400">
          支持按关键词搜索（标题、摘要、信息源、标签、实体），并按分类与国家筛选 ·
          共 {items.length} 篇文章
        </p>
      </header>

      <NewsExplorer items={items} />
    </div>
  );
}
