import { notFound } from "next/navigation";

import { Configurator } from "@/components/configurator/Configurator";
import { Reveal } from "@/components/motion/Reveal";
import { getProductWithDetails } from "@/lib/catalog/queries";

interface ConfigurePageProps {
  params: Promise<{ slug: string }>;
}

export default async function ConfigurePage({ params }: ConfigurePageProps) {
  const { slug } = await params;
  const product = await getProductWithDetails(slug);

  if (!product || !product.isConfigurable) notFound();

  return (
    <div className="section-padding">
      <div className="container-wide">
        <Reveal>
          <Configurator product={product} />
        </Reveal>
      </div>
    </div>
  );
}
