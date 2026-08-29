import {Composer} from '@/components/composer';
import {PostCardSkeleton} from '@/components/post-card';

export default function FeedLoading() {
  return (
    <div className="mx-auto w-full max-w-[640px] px-4 pb-10">
      <h1 className="sr-only">世界</h1>
      <div className="pt-3">
        <Composer userName="…" userImage={null} />
      </div>
      <div className="mt-2 divide-y divide-border">
        {Array.from({length: 4}).map((_, i) => (
          <PostCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
