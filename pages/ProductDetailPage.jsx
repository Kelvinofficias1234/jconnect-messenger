import React from 'react';
import { useParams } from 'react-router-dom';
import ProductDetail from '@/components/marketplace/ProductDetail';

export default function ProductDetailPage() {
  const { productId } = useParams();
  return <ProductDetail productId={productId} />;
}