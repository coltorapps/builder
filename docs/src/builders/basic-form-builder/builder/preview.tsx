import { useRef, useState } from "react";
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
      <Button variant="secondary" size="sm" onClick={() => void openPreview()}>
        <EyeIcon className="mr-2 h-4 w-4" />
        Preview Form
      </Button>
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
