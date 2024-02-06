import { useRef, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/use-toast";
import { AlertCircle, CheckCircle2, EyeIcon } from "lucide-react";

import {
  type BuilderStore,
  type EntitiesValues,
  type InterpreterStore,
  type Schema,
} from "@coltorapps/builder";
import { Interpreter, useInterpreterStore } from "@coltorapps/builder-react";

import { DatePickerFieldEntity } from "../entities/date-picker/component";
import { ParagraphEntity } from "../entities/paragraph/component";
import { SelectFieldEntity } from "../entities/select-field/component";
import { TextFieldEntity } from "../entities/text-field/component";
import { TextareaFieldEntity } from "../entities/textarea-field/component";
import { basicFormBuilder } from "./definition";

function Form(props: {
  interpreterStore: InterpreterStore<typeof basicFormBuilder>;
  onSubmit: () => void;
  onValidationFail: () => void;
}) {
  const { toast } = useToast();

  async function handleSubmit() {
    const result = await props.interpreterStore.validateEntitiesValues();

    if (result.success) {
      props.onSubmit();

      toast({
        title: (
          <span>
            <CheckCircle2 className="mr-2 inline text-green-500" /> Submission
            successful.
          </span>
        ),
      });
    } else {
      props.onValidationFail();
    }
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();

        void handleSubmit();
      }}
      className="-mx-1 grid gap-4 px-2 py-4"
      noValidate
    >
      <Interpreter
        interpreterStore={props.interpreterStore}
        components={{
          textField: TextFieldEntity,
          selectField: SelectFieldEntity,
          datePickerField: DatePickerFieldEntity,
          textareaField: TextareaFieldEntity,
          paragraph: ParagraphEntity,
        }}
      />
      <div className="flex justify-end">
        <Button type="submit">Submit</Button>
      </div>
    </form>
  );
}

function PreviewJsonCard(props: { json?: Record<string, unknown> }) {
  return (
    <Card>
      <CardContent className="max-h-96 overflow-auto py-4">
        <pre className="w-1 text-xs">
          {JSON.stringify(props.json, undefined, 2)}
        </pre>
      </CardContent>
    </Card>
  );
}

const tabs = {
  form: "form",
  values: "values",
  schema: "schema",
};

export function Preview(props: {
  builderStore: BuilderStore<typeof basicFormBuilder>;
  activeEntityId?: string | null;
  onEntityError: (id: string) => void;
}) {
  const { toast } = useToast();

  const [previewVisible, setPreviewVisible] = useState(false);

  const [schema, setSchema] = useState<Schema<typeof basicFormBuilder>>();

  const submitAttemptedRef = useRef(false);

  const interpreterStore = useInterpreterStore(
    basicFormBuilder,
    schema ?? { entities: {}, root: [] },
    {
      events: {
        onEntityValueUpdated(payload) {
          if (submitAttemptedRef.current) {
            void interpreterStore.validateEntityValue(payload.entityId);
          }
        },
      },
    },
  );

  async function openPreview() {
    const result = await props.builderStore.validateSchema();

    if (result.success) {
      setPreviewVisible(true);

      setSchema(result.data);

      return;
    }

    if (
      result.reason.code === "InvalidEntitiesAttributes" &&
      props.activeEntityId &&
      !result.reason.payload.entitiesAttributesErrors[props.activeEntityId]
    ) {
      props.onEntityError(
        Object.keys(result.reason.payload.entitiesAttributesErrors)[0],
      );
    }

    toast({
      title: (
        <span>
          <AlertCircle className="text-destructive mr-2 inline" /> Please fix
          the highlighted errors.
        </span>
      ),
    });
  }

  const [previewValues, setPreviewValues] =
    useState<EntitiesValues<typeof basicFormBuilder>>();

  return (
    <div>
      <div className="dark:hover:prose-a:text-secondary-foreground dark:prose-a:text-secondary-foreground prose-a:no-underline prose-a:font-medium flex gap-4">
        <Button variant="secondary" size="sm" asChild>
          <Link
            href="https://github.com/coltorapps/builder/tree/main/docs/src/builders/basic-form-builder"
            target="_blank"
            className="not-prose"
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 16 16"
              className="mr-2 h-4 w-4 fill-current"
            >
              <path d="M8 0C3.58 0 0 3.58 0 8C0 11.54 2.29 14.53 5.47 15.59C5.87 15.66 6.02 15.42 6.02 15.21C6.02 15.02 6.01 14.39 6.01 13.72C4 14.09 3.48 13.23 3.32 12.78C3.23 12.55 2.84 11.84 2.5 11.65C2.22 11.5 1.82 11.13 2.49 11.12C3.12 11.11 3.57 11.7 3.72 11.94C4.44 13.15 5.59 12.81 6.05 12.6C6.12 12.08 6.33 11.73 6.56 11.53C4.78 11.33 2.92 10.64 2.92 7.58C2.92 6.71 3.23 5.99 3.74 5.43C3.66 5.23 3.38 4.41 3.82 3.31C3.82 3.31 4.49 3.1 6.02 4.13C6.66 3.95 7.34 3.86 8.02 3.86C8.7 3.86 9.38 3.95 10.02 4.13C11.55 3.09 12.22 3.31 12.22 3.31C12.66 4.41 12.38 5.23 12.3 5.43C12.81 5.99 13.12 6.7 13.12 7.58C13.12 10.65 11.25 11.33 9.47 11.53C9.76 11.78 10.01 12.26 10.01 13.01C10.01 14.08 10 14.94 10 15.21C10 15.42 10.15 15.67 10.55 15.59C13.71 14.53 16 11.53 16 8C16 3.58 12.42 0 8 0Z" />
            </svg>
            View on Github
          </Link>
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => void openPreview()}
        >
          <EyeIcon className="mr-2 h-4 w-4" />
          Preview Form
        </Button>
      </div>
      <Dialog modal open={previewVisible} onOpenChange={setPreviewVisible}>
        <DialogContent className="sm:top-[20%] sm:translate-y-0">
          <DialogHeader>
            <DialogTitle>Preview</DialogTitle>
          </DialogHeader>
          <Tabs
            defaultValue="form"
            className="w-full"
            onValueChange={(tab) => {
              if (tab === tabs.values) {
                setPreviewValues(interpreterStore.getEntitiesValues());
              }
            }}
          >
            <TabsList className="w-full">
              <div className="my-px grid w-full grid-cols-3">
                <TabsTrigger value={tabs.form}>Form</TabsTrigger>
                <TabsTrigger value={tabs.values}>Values</TabsTrigger>
                <TabsTrigger value={tabs.schema}>Schema</TabsTrigger>
              </div>
            </TabsList>
            <TabsContent value={tabs.form}>
              <ScrollArea className="max-h-96 overflow-auto">
                <Form
                  interpreterStore={interpreterStore}
                  onSubmit={() => setPreviewVisible(false)}
                  onValidationFail={() => (submitAttemptedRef.current = true)}
                />
              </ScrollArea>
            </TabsContent>
            <TabsContent value={tabs.values}>
              <PreviewJsonCard json={previewValues} />
            </TabsContent>
            <TabsContent value={tabs.schema}>
              <PreviewJsonCard json={schema} />
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </div>
  );
}
