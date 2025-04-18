import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export type WalletTransaction = {
  id: string;
  amount: number;
  type: "deposit" | "payment"; // Strict union type for transaction types
  description: string;
  date: Date;
};

export const useWallet = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const fetchWalletTransactions = async () => {
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('wallet_transactions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return data.map(tx => ({
      id: tx.id,
      amount: Number(tx.amount),
      type: tx.type === 'reload' ? 'deposit' as const : 'payment' as const,
      description: tx.description,
      date: new Date(tx.created_at)
    })) as WalletTransaction[];
  };

  const calculateBalance = (transactions: WalletTransaction[]) => {
    return transactions.reduce((total, tx) => {
      if (tx.type === 'deposit' || tx.type === 'Credit' || tx.type === 'reload') {
        return total + tx.amount;
      } else {
        return total - tx.amount;
      }
    }, 0);
  };

  const { data: transactions = [], isLoading, error } = useQuery({
    queryKey: ['walletTransactions', user?.id],
    queryFn: fetchWalletTransactions,
    enabled: !!user,
  });

  const balance = calculateBalance(transactions);

  const addFundsMutation = useMutation({
    mutationFn: async ({ amount, description = 'Wallet Reload' }: { amount: number, description?: string }) => {
      if (!user) throw new Error('User not authenticated');
      
      const newTransaction = {
        user_id: user.id,
        amount: amount,
        type: 'reload',
        description: description
      };
      
      const { data, error } = await supabase
        .from('wallet_transactions')
        .insert(newTransaction)
        .select()
        .single();
        
      if (error) throw error;
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['walletTransactions', user?.id] });
      toast({
        title: "Funds Added",
        description: "Your wallet has been topped up successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error Adding Funds",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const makePaymentMutation = useMutation({
    mutationFn: async ({ amount, description }: { amount: number, description: string }) => {
      if (!user) throw new Error('User not authenticated');
      
      const currentTransactions = await fetchWalletTransactions();
      const currentBalance = calculateBalance(currentTransactions);
      
      if (currentBalance < amount) {
        throw new Error('Insufficient funds in wallet');
      }
      
      const newTransaction = {
        user_id: user.id,
        amount: amount,
        type: 'payment',
        description: description
      };
      
      const { data, error } = await supabase
        .from('wallet_transactions')
        .insert(newTransaction)
        .select()
        .single();
        
      if (error) throw error;
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['walletTransactions', user?.id] });
      toast({
        title: "Payment Successful",
        description: "Your payment has been processed successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Payment Failed",
        description: error.message,
        variant: "destructive",
      });
      throw error;
    }
  });

  return {
    balance,
    transactions,
    isLoading,
    error,
    addFunds: (amount: number, description?: string) => 
      addFundsMutation.mutate({ amount, description }),
    isAddingFunds: addFundsMutation.isPending,
    makePayment: (amount: number, description: string) => 
      makePaymentMutation.mutate({ amount, description }),
    isProcessingPayment: makePaymentMutation.isPending
  };
};
