'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { CalendarIcon, CreditCard, Building2, Wallet } from 'lucide-react';
import { format } from 'date-fns';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from '@/components/ui/use-toast';

import type { 
  Deposit, 
  CreateWithdrawalRequest, 
  PaymentMethod, 
  ReasonCategory, 
  UrgencyLevel 
} from '@/types/withdrawal';
import { WithdrawalsService, DepositsService, withdrawalUtils } from '@/lib/api/withdrawals';

const withdrawalFormSchema = z.object({
  depositId: z.string().min(1, 'Deposit is required'),
  amount: z.number().min(1, 'Amount must be greater than 0'),
  reason: z.string().min(10, 'Reason must be at least 10 characters'),
  reasonCategory: z.enum(['EMERGENCY', 'PERSONAL', 'BUSINESS', 'OTHER']).optional(),
  urgency: z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT']).optional(),
  plannedDate: z.date().optional(),
  paymentMethod: z.enum(['BANK_TRANSFER', 'CHECK', 'CASH', 'CREDIT_CARD', 'STANDING_ORDER']).optional(),
  bankDetails: z.object({
    bankName: z.string().min(1, 'Bank name is required'),
    accountNumber: z.string().min(1, 'Account number is required'),
    routingNumber: z.string().optional(),
    accountHolderName: z.string().min(1, 'Account holder name is required'),
    iban: z.string().optional(),
    swift: z.string().optional(),
  }).optional(),
});

type WithdrawalFormData = z.infer<typeof withdrawalFormSchema>;

interface WithdrawalRequestFormProps {
  onSuccess?: (withdrawal: any) => void;
  onCancel?: () => void;
}

export function WithdrawalRequestForm({ onSuccess, onCancel }: WithdrawalRequestFormProps) {
  const t = useTranslations('withdrawals');
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [selectedDeposit, setSelectedDeposit] = useState<Deposit | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showBankDetails, setShowBankDetails] = useState(false);

  const form = useForm<WithdrawalFormData>({
    resolver: zodResolver(withdrawalFormSchema),
    defaultValues: {
      urgency: 'NORMAL',
      paymentMethod: 'BANK_TRANSFER',
    },
  });

  useEffect(() => {
    const loadDeposits = async () => {
      try {
        const depositsData = await DepositsService.getUserDeposits();
        setDeposits(depositsData.filter(d => d.isActive && d.currentBalance > 0));
      } catch (error) {
        toast({
          title: t('errors.loadingFailed'),
          description: 'Failed to load deposits',
          variant: 'destructive',
        });
      }
    };

    loadDeposits();
  }, [t]);

  const watchedPaymentMethod = form.watch('paymentMethod');
  
  useEffect(() => {
    setShowBankDetails(watchedPaymentMethod === 'BANK_TRANSFER');
  }, [watchedPaymentMethod]);

  const watchedDepositId = form.watch('depositId');
  
  useEffect(() => {
    if (watchedDepositId) {
      const deposit = deposits.find(d => d.id === watchedDepositId);
      setSelectedDeposit(deposit || null);
    }
  }, [watchedDepositId, deposits]);

  const watchedAmount = form.watch('amount');
  
  const validateAmount = (amount: number): string | null => {
    if (!selectedDeposit) return null;
    if (amount > selectedDeposit.currentBalance) {
      return t('form.validation.amountExceedsBalance');
    }
    return null;
  };

  const onSubmit = async (data: WithdrawalFormData) => {
    setIsLoading(true);
    
    try {
      const amountError = validateAmount(data.amount);
      if (amountError) {
        form.setError('amount', { message: amountError });
        return;
      }

      const withdrawalData: CreateWithdrawalRequest = {
        depositId: data.depositId,
        amount: data.amount,
        reason: data.reason,
        reasonCategory: data.reasonCategory,
        urgency: data.urgency || 'NORMAL',
        plannedDate: data.plannedDate?.toISOString(),
        paymentMethod: data.paymentMethod,
        bankDetails: data.bankDetails,
      };

      const result = await WithdrawalsService.create(withdrawalData);
      
      toast({
        title: t('messages.requestSubmitted'),
        description: `Request ${result.requestNumber} has been created successfully.`,
      });

      if (onSuccess) {
        onSuccess(result);
      }
    } catch (error: any) {
      toast({
        title: t('errors.submissionFailed'),
        description: error.response?.data?.message || 'Failed to create withdrawal request',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const reasonCategories: { value: ReasonCategory; label: string }[] = [
    { value: 'EMERGENCY', label: t('reasonCategories.EMERGENCY') },
    { value: 'PERSONAL', label: t('reasonCategories.PERSONAL') },
    { value: 'BUSINESS', label: t('reasonCategories.BUSINESS') },
    { value: 'OTHER', label: t('reasonCategories.OTHER') },
  ];

  const urgencyLevels: { value: UrgencyLevel; label: string }[] = [
    { value: 'LOW', label: t('urgencyLevels.LOW') },
    { value: 'NORMAL', label: t('urgencyLevels.NORMAL') },
    { value: 'HIGH', label: t('urgencyLevels.HIGH') },
    { value: 'URGENT', label: t('urgencyLevels.URGENT') },
  ];

  const paymentMethods: { value: PaymentMethod; label: string; icon: any }[] = [
    { value: 'BANK_TRANSFER', label: 'Bank Transfer', icon: Building2 },
    { value: 'CHECK', label: 'Check', icon: CreditCard },
    { value: 'CASH', label: 'Cash', icon: Wallet },
  ];

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-6 w-6" />
          {t('form.title')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            
            {/* Deposit Selection */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="depositId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('form.deposit')}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t('form.selectDeposit')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {deposits.map((deposit) => (
                          <SelectItem key={deposit.id} value={deposit.id}>
                            <div className="flex flex-col">
                              <span>{deposit.depositNumber} - {deposit.type}</span>
                              <span className="text-sm text-muted-foreground">
                                {t('form.availableBalance')}: {withdrawalUtils.formatAmount(deposit.currentBalance)}
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {selectedDeposit && (
                <div className="space-y-2">
                  <Label>{t('form.availableBalance')}</Label>
                  <div className="p-3 bg-muted rounded-lg">
                    <div className="flex justify-between items-center">
                      <span className="font-medium">{selectedDeposit.depositNumber}</span>
                      <Badge variant="outline">{selectedDeposit.type}</Badge>
                    </div>
                    <div className="text-2xl font-bold text-primary">
                      {withdrawalUtils.formatAmount(selectedDeposit.currentBalance)}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Amount and Basic Info */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('form.amount')}</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder={t('form.amountPlaceholder')}
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                      />
                    </FormControl>
                    {watchedAmount > 0 && selectedDeposit && (
                      <FormDescription>
                        {watchedAmount > selectedDeposit.currentBalance ? (
                          <span className="text-destructive">{t('form.validation.amountExceedsBalance')}</span>
                        ) : (
                          <span className="text-muted-foreground">
                            Remaining: {withdrawalUtils.formatAmount(selectedDeposit.currentBalance - watchedAmount)}
                          </span>
                        )}
                      </FormDescription>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="reasonCategory"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('form.reasonCategory')}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {reasonCategories.map((category) => (
                          <SelectItem key={category.value} value={category.value}>
                            {category.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="urgency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('form.urgency')}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {urgencyLevels.map((level) => (
                          <SelectItem key={level.value} value={level.value}>
                            <div className="flex items-center gap-2">
                              <div 
                                className={`w-2 h-2 rounded-full bg-${withdrawalUtils.getUrgencyColor(level.value)}-500`} 
                              />
                              {level.label}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Reason */}
            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('form.reason')}</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={t('form.reasonPlaceholder')}
                      className="min-h-[100px]"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    {field.value?.length || 0}/1000 characters
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Dates and Payment */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="plannedDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('form.plannedDate')}</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className="w-full pl-3 text-left font-normal"
                          >
                            {field.value ? (
                              format(field.value, 'PPP')
                            ) : (
                              <span className="text-muted-foreground">Pick a date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) => date < new Date()}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="paymentMethod"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('form.paymentMethod')}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {paymentMethods.map((method) => (
                          <SelectItem key={method.value} value={method.value}>
                            <div className="flex items-center gap-2">
                              <method.icon className="h-4 w-4" />
                              {method.label}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Bank Details */}
            {showBankDetails && (
              <>
                <Separator />
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-5 w-5" />
                    <h3 className="text-lg font-semibold">{t('form.bankDetails')}</h3>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="bankDetails.bankName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('form.bankName')}</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="bankDetails.accountHolderName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('form.accountHolderName')}</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="bankDetails.accountNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('form.accountNumber')}</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="bankDetails.routingNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('form.routingNumber')}</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              </>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={onCancel}
                disabled={isLoading}
              >
                {t('form.cancel')}
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Submitting...' : t('form.submit')}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}