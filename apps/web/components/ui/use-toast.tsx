import { toast } from 'sonner'

export const useToast = () => {
  return {
    toast: (props: any) => {
      if (props.variant === 'destructive') {
        toast.error(props.description || props.title)
      } else {
        toast.success(props.description || props.title)
      }
    }
  }
}

export { toast }