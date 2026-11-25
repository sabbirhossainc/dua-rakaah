import CategoryPage, {
  generateCategoryMetadata,
} from "@/app/components/content/CategoryPage";

// Reading searchParams (the ?cat=N value) makes this page render per request.
export function generateMetadata({ params, searchParams }) {
  return generateCategoryMetadata({ lang: "en", params, searchParams });
}

export default function Page({ params, searchParams }) {
  return <CategoryPage lang="en" params={params} searchParams={searchParams} />;
}
