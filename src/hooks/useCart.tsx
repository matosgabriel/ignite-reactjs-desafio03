import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

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
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => Promise<void>;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart');

    return storagedCart ? JSON.parse(storagedCart) : [];
  });

  const addProduct = async (productId: number) => {
    try {
      const { data: productExists } = await api.get(`products/${productId}`);
      if (!productExists) throw new Error();

      const productAlreadyInCart = cart.find(product => product.id === productId);
      const { data: stock } = await api.get<Stock>(`stock/${productId}`);
      let newCart: Product[] = [];

      if (productAlreadyInCart) {
        if (stock.amount < productAlreadyInCart.amount + 1) {
          toast.error('Quantidade solicitada fora de estoque');
          return;
        }
        
        newCart = cart.map(product => {
          return product.id === productId
            ? { ...product, amount: product.amount + 1 }
            : product;
        });
      } else {
        if (stock.amount < 1) {
          toast.error('Quantidade solicitada fora de estoque');
          return;
        }
        
        const { data } = await api.get<Product>(`products/${productId}`);
        const { id, image, price, title } = data;
  
        newCart = [...cart, { id, image, price, title, amount: 1 }];
      }

      setCart(newCart);
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart));
    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const productExistsInCart = cart.find(product => product.id === productId);

      if (!productExistsInCart) throw new Error();

      const newCart = cart.filter(product => product.id !== productId);
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
      if (amount <= 0) return;
      const { data: stock } = await api.get<Stock>(`stock/${productId}`);

      if (stock.amount < amount) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      const newCart = cart.map(product => {
        return product.id === productId ? { ...product, amount } : product;
      });

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
