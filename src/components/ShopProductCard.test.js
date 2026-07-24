import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import ShopProductCard from './ShopProductCard';

test('изображение товара открывается доступной с клавиатуры кнопкой', () => {
  const product = {
    id: 'roll-1',
    name: 'Филадельфия',
    image: '/roll.jpg',
    price: 490,
  };
  const onImageClick = jest.fn();

  render(
    <ShopProductCard
      product={product}
      quantity={0}
      onAdd={jest.fn()}
      onUpdateQuantity={jest.fn()}
      onImageClick={onImageClick}
    />
  );

  const imageButton = screen.getByRole('button', {
    name: 'Открыть описание товара «Филадельфия»',
  });
  fireEvent.click(imageButton);

  expect(onImageClick).toHaveBeenCalledWith(product);
});
