"use client";

import { ProductMediaCarousel } from "@/components/product/ProductMediaCarousel";
import type { ProductMedia } from "@/types/commerce";

interface ProductGalleryProps {
  media: ProductMedia[];
  productName: string;
}

export function ProductGallery({ media, productName }: ProductGalleryProps) {
  return <ProductMediaCarousel media={media} productName={productName} spacious />;
}
