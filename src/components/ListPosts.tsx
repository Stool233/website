interface Post {
  id: string;
  slug: string;
  data: Record<string, any>;
  collection: string;
}

interface Props {
  list: Post[];
  mini?: boolean;
}

function getYear(date: string | Date) {
  return new Date(date).getFullYear();
}

function isSameYear(a: string | Date | undefined, b: string | Date | undefined) {
  return a && b && getYear(a) === getYear(b);
}

function getHref(post: Post) {
  if (post.data.redirect) return post.data.redirect;
  return `/${post.collection}/${post.slug}`;
}

function getTarget(post: Post) {
  return post.data.redirect ? "_blank" : "_self";
}

export default function ListPosts({ list, mini = false }: Props) {
  if (!list || list.length === 0) {
    return <div className="py-2 text-gray-400">nothing here yet.</div>;
  }

  return (
    <ul className="list-none p-0">
      {list.map((post, index) => (
        <li key={post.data.title} className={mini ? "mb-4" : "mb-6"}>
          {/* Year separator */}
          {!mini &&
            !isSameYear(post.data.date, list[index - 1]?.data.date) && (
              <div className="select-none relative h-18 pointer-events-none">
                <span className="text-7xl -ml-2 xl:-ml-18 absolute -top-1 -z-10 font-neucha text-[#eaeaea] dark:text-[#474747]">
                  {getYear(post.data.date)}
                </span>
              </div>
            )}

          <div className="text-lg leading-tight flex flex-col gap-1">
            {/* Title row */}
            <div
              className={`flex flex-col md:flex-row md:items-center flex-wrap ${
                mini ? "text-sm" : "text-lg"
              }`}
            >
              {mini && (
                <time className="w-32 flex-none text-gray-500">
                  {post.data.date}
                </time>
              )}
              <a
                target={getTarget(post)}
                href={getHref(post)}
                className={`nav-link ${
                  mini ? "text-lg text-link" : "text-2xl"
                }`}
              >
                <span className="leading-normal inline-flex items-center">
                  {post.data.title}
                </span>
              </a>
            </div>

            {/* Description */}
            {!mini && post.data.description && (
              <div className="text-gray-500 text-base">
                {post.data.description}
              </div>
            )}

            {/* Meta: date + tags */}
            {!mini && (
              <div className="text-gray-500 text-sm whitespace-nowrap flex gap-1 items-center flex-wrap w-full">
                <time>{post.data.date}</time>
                {post.data.tags && post.data.tags.length > 0 && (
                  <div className="flex gap-1 items-center">
                    <span>·</span>
                    {post.data.tags.map((tag: string) => (
                      <span key={tag} className="text-link text-xs">
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}
