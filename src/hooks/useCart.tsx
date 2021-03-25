import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart'); // Buscar dados do localStorage

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const currentAmount = cart.find((product) => product.id === productId)
        ?.amount;
      const { data: productStock } = await api.get(`stock/${productId}`);
      let newCart: Product[] = [];

      if (currentAmount === undefined) {
        const { data: productData } = await api.get<Product>(
          `products/${productId}`
        );
        newCart = [...cart, { ...productData, amount: 1 }];
      } else if (currentAmount + 1 > productStock.amount) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      } else {
        newCart = cart.map((product) => ({
          ...product,
          amount:
            product.id === productId ? product.amount + 1 : product.amount,
        }));
      }
      setCart(newCart);
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart));
    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const findIndex = cart.find((product) => product.id === productId);

      if (findIndex === undefined) {
        throw Error('product not found');
      }

      const newCart = cart.filter((product) => product.id !== productId);
      setCart(newCart);
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart));
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      const product = cart.find((product) => product.id === productId);

      if (product === undefined) {
        throw Error('Product not found');
      }

      if (amount <= 0) {
        return;
      }
      const { data: productStock } = await api.get(`stock/${productId}`);

      console.log(amount);
      console.log(productStock.amount);

      if (amount > productStock.amount) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      const newCart = cart.map((product) => ({
        ...product,
        amount: product.id === productId ? amount : product.amount,
      }));

      setCart(newCart);
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart));
    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
