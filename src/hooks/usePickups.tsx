import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Product } from '@/hooks/useProducts';
import { useWallet } from '@/hooks/useWallet';

export type PickupItem = {
  product: Product;
  quantity: number;
};

export type Pickup = {
  id: string;
  date: string;
  time: string;
  status: 'pending' | 'ready' | 'completed' | 'cancelled';
  total: number;
  items: PickupItem[];
};

export const usePickups = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { makePayment } = useWallet();
  
  const { data: pickups = [], isLoading } = useQuery({
    queryKey: ['pickups', user?.id],
    queryFn: async () => {
      if (!user) throw new Error('User not authenticated');
      
      const { data: pickupsData, error: pickupsError } = await supabase
        .from('pickups')
        .select('*')
        .eq('user_id', user.id);
        
      if (pickupsError) throw pickupsError;
      
      const pickupsWithItems = await Promise.all(
        pickupsData.map(async (pickup) => {
          const { data: itemsData, error: itemsError } = await supabase
            .from('pickup_items')
            .select(`
              quantity, price,
              products (
                id, name, price, description, image, 
                long_description, roast_level, origin, flavor_notes, weight,
                categories(name)
              )
            `)
            .eq('pickup_id', pickup.id);
            
          if (itemsError) throw itemsError;
          
          const items = itemsData.map(item => ({
            product: {
              id: item.products.id,
              name: item.products.name,
              price: Number(item.price),
              image: item.products.image,
              description: item.products.description,
              category: item.products.categories?.name || "Unknown",
              longDescription: item.products.long_description,
              roastLevel: item.products.roast_level,
              origin: item.products.origin,
              flavorNotes: item.products.flavor_notes,
              weight: item.products.weight
            },
            quantity: item.quantity
          }));
          
          return {
            id: pickup.id,
            date: pickup.pickup_date,
            time: pickup.pickup_time,
            status: pickup.status,
            total: Number(pickup.total),
            items: items
          };
        })
      );
      
      return pickupsWithItems;
    },
    enabled: !!user
  });
  
  const createPickupMutation = useMutation({
    mutationFn: async ({ 
      date, 
      time, 
      items 
    }: { 
      date: string; 
      time: string; 
      items: PickupItem[];
    }) => {
      if (!user) throw new Error('User not authenticated');
      if (items.length === 0) throw new Error('No items in pickup');
      
      const total = items.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
      
      try {
        await makePayment(total, `Coffee Pickup Scheduled for ${date} at ${time}`);
        
        const { data: pickupData, error: pickupError } = await supabase
          .from('pickups')
          .insert({
            user_id: user.id,
            pickup_date: date,
            pickup_time: time,
            total: total,
            status: 'pending'
          })
          .select()
          .single();
          
        if (pickupError) throw pickupError;
        
        const pickupItems = items.map(item => ({
          pickup_id: pickupData.id,
          product_id: item.product.id,
          quantity: item.quantity,
          price: item.product.price
        }));
        
        const { error: itemsError } = await supabase
          .from('pickup_items')
          .insert(pickupItems);
          
        if (itemsError) throw itemsError;
        
        return pickupData;
      } catch (error: any) {
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pickups', user?.id] });
      toast({
        title: "Pickup Scheduled",
        description: "Your pickup has been scheduled successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error Scheduling Pickup",
        description: error.message,
        variant: "destructive",
      });
    }
  });
  
  const cancelPickupMutation = useMutation({
    mutationFn: async (pickupId: string) => {
      if (!user) throw new Error('User not authenticated');
      
      const { data, error } = await supabase
        .from('pickups')
        .update({ status: 'cancelled' })
        .eq('id', pickupId)
        .eq('user_id', user.id)
        .select();
        
      if (error) throw error;
      
      return data[0];
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pickups', user?.id] });
      toast({
        title: "Pickup Cancelled",
        description: "Your pickup has been cancelled successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error Cancelling Pickup",
        description: error.message,
        variant: "destructive",
      });
    }
  });
  
  return {
    pickups,
    isLoading,
    createPickup: createPickupMutation.mutate,
    isCreating: createPickupMutation.isPending,
    cancelPickup: cancelPickupMutation.mutate,
    isCancelling: cancelPickupMutation.isPending
  };
};
