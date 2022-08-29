import { GetStaticPaths, GetStaticPropsContext, InferGetStaticPropsType } from 'next';
import { createSSGHelpers } from '@trpc/react/ssg';
import superjson from 'superjson';
import { prisma } from '@server/prisma';
import { createContext } from '@server/context';
import { appRouter } from '@server/routers/_app';
import { trpc } from '@utils/trpc';
import SnippetDetail from '@features/snippetDetail';

export default function Snippet({ id }: InferGetStaticPropsType<typeof getStaticProps>) {
  const snippetQuery = trpc.useQuery(['snippet.byId', { id }], {
    enabled: !!id,
    retryOnMount: true,
    retry: false,
  });
  if (snippetQuery.isLoading) {
    return <div>Loading...</div>;
  }
  if (snippetQuery.isSuccess) {
    return <SnippetDetail snippet={snippetQuery.data} />;
  }
  return <div>Error</div>;
}

export async function getStaticProps(ctx: GetStaticPropsContext<{ id: string; }>) {
  const ssg = createSSGHelpers({
    router: appRouter,
    ctx: await createContext(),
    transformer: superjson,
  });
  const id = ctx.params?.id as string;
  await ssg.prefetchQuery('snippet.byId', { id });
  return {
    props: {
      trpcState: ssg.dehydrate(),
      id,
    },
  };
}

export const getStaticPaths: GetStaticPaths = async () => {
  const snippets = await prisma.snippet.findMany({
    where: { deleted: false },
    select: {
      id: true,
    },
  });
  return {
    paths: snippets.map(({ id }) => ({
      params: {
        id,
      },
    })),
    fallback: 'blocking',
  };
};
