import { createRule, updateRule } from "@/client/rule";
import { AppRule } from "@/client/types";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

const schema = z.object({
  key: z.string().min(1, "필수"),
  value: z.coerce.number(),
});
type FormValues = z.infer<typeof schema>;

type Props = {
  init?: AppRule;
  reload: () => Promise<any>;
  close: () => void;
};

function ExpForm({ init, reload, close }: Props) {
  const [isLoading, setLoading] = useState(false);
  const [focusedId, setFocusedId] = useState<number>();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { key: "", value: 0 },
  });

  useEffect(() => {
    if (!init) return;
    setFocusedId(init.id);
    form.reset({ key: init.key, value: init.value });
  }, [init]);

  const save = async (values: FormValues) => {
    try {
      setLoading(true);
      if (focusedId) {
        await updateRule({ id: focusedId, key: values.key, value: values.value, isActive: true });
      } else {
        await createRule({ key: values.key, value: values.value });
      }
      await reload();
      close();
    } catch (err) {
      toast.error(`${err}`);
    }
    setLoading(false);
  };

  return (
    <>
      {isLoading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      )}
      <Form {...form}>
        <form onSubmit={form.handleSubmit(save)} className="space-y-4">
          <FormField
            control={form.control}
            name="key"
            render={({ field }) => (
              <FormItem>
                <FormLabel>key</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="value"
            render={({ field }) => (
              <FormItem>
                <FormLabel>다음 레벨업 필요 경험치</FormLabel>
                <FormControl>
                  <Input type="number" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" size="lg">
            저장
          </Button>
        </form>
      </Form>
    </>
  );
}

export default ExpForm;
