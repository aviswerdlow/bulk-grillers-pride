"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle, AlertCircle, Info } from "lucide-react";

export default function FormValidationDemo() {
  const [showValidation, setShowValidation] = useState(false);

  return (
    <div className="container mx-auto p-8 space-y-8">
      <h1 className="text-3xl font-bold text-semantic-primary">Form Validation with Semantic Colors</h1>
      <p className="text-lg text-semantic-secondary">
        This page demonstrates form validation states using the semantic color system with proper ARIA attributes.
      </p>

      {/* Validation State Toggle */}
      <Card>
        <CardHeader>
          <CardTitle>Toggle Validation States</CardTitle>
        </CardHeader>
        <CardContent>
          <Button onClick={() => setShowValidation(!showValidation)}>
            {showValidation ? "Hide" : "Show"} Validation States
          </Button>
        </CardContent>
      </Card>

      {/* Text Input Examples */}
      <Card>
        <CardHeader>
          <CardTitle>Text Input Validation States</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="input-default">Default Input</Label>
            <Input id="input-default" placeholder="Enter text..." />
            <p className="text-sm text-semantic-secondary">Helper text for additional context</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="input-error" className={showValidation ? "text-semantic-danger" : ""}>
              Required Field
            </Label>
            <Input 
              id="input-error" 
              placeholder="This field is required"
              aria-invalid={showValidation}
              aria-describedby={showValidation ? "input-error-message" : undefined}
              aria-required="true"
            />
            {showValidation && (
              <p id="input-error-message" className="text-sm text-semantic-danger">
                This field is required and cannot be empty
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="input-success">Email (Valid)</Label>
            <Input 
              id="input-success" 
              type="email"
              defaultValue="user@example.com"
              className="border-semantic-success focus-success"
            />
            <p className="text-sm text-semantic-success flex items-center gap-1">
              <CheckCircle className="h-3 w-3" />
              Email format is valid
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="input-warning">Username (Warning)</Label>
            <Input 
              id="input-warning" 
              defaultValue="user123"
              className="border-semantic-warning focus-warning"
            />
            <p className="text-sm text-semantic-warning flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              Username is available but contains numbers
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Textarea Examples */}
      <Card>
        <CardHeader>
          <CardTitle>Textarea Validation States</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="textarea-error" className={showValidation ? "text-semantic-danger" : ""}>
              Description
            </Label>
            <Textarea 
              id="textarea-error"
              placeholder="Enter description..."
              aria-invalid={showValidation}
              aria-describedby={showValidation ? "textarea-error-message" : undefined}
              aria-required="true"
            />
            {showValidation && (
              <p id="textarea-error-message" className="text-sm text-semantic-danger">
                Description must be at least 10 characters long
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Select Examples */}
      <Card>
        <CardHeader>
          <CardTitle>Select Dropdown Validation States</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="select-error" className={showValidation ? "text-semantic-danger" : ""}>
              Category
            </Label>
            <Select aria-invalid={showValidation}>
              <SelectTrigger id="select-error" aria-describedby={showValidation ? "select-error-message" : undefined}>
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="electronics">Electronics</SelectItem>
                <SelectItem value="clothing">Clothing</SelectItem>
                <SelectItem value="food">Food</SelectItem>
              </SelectContent>
            </Select>
            {showValidation && (
              <p id="select-error-message" className="text-sm text-semantic-danger">
                Please select a category
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Checkbox and Radio Examples */}
      <Card>
        <CardHeader>
          <CardTitle>Checkbox and Radio Validation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label className={showValidation ? "text-semantic-danger" : ""}>
              Terms and Conditions
            </Label>
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="terms" 
                aria-invalid={showValidation}
                aria-describedby={showValidation ? "terms-error" : undefined}
                aria-required="true"
              />
              <Label htmlFor="terms" className="text-sm font-normal">
                I agree to the terms and conditions
              </Label>
            </div>
            {showValidation && (
              <p id="terms-error" className="text-sm text-semantic-danger">
                You must accept the terms and conditions
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label className={showValidation ? "text-semantic-danger" : ""}>
              Subscription Plan
            </Label>
            <RadioGroup aria-invalid={showValidation} aria-required="true">
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="basic" id="basic" />
                <Label htmlFor="basic">Basic Plan</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="pro" id="pro" />
                <Label htmlFor="pro">Pro Plan</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="enterprise" id="enterprise" />
                <Label htmlFor="enterprise">Enterprise Plan</Label>
              </div>
            </RadioGroup>
            {showValidation && (
              <p className="text-sm text-semantic-danger">
                Please select a subscription plan
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Focus State Examples */}
      <Card>
        <CardHeader>
          <CardTitle>Focus State Examples</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert className="border-semantic-info bg-semantic-info pattern-info">
            <Info className="h-4 w-4 text-semantic-info" />
            <AlertDescription className="text-semantic-info">
              Tab through the form fields to see the semantic focus styles. Each field uses the focus-default utility 
              which provides a 3px focus ring with proper color and offset.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* ARIA Attributes Guide */}
      <Card>
        <CardHeader>
          <CardTitle>ARIA Attributes Applied</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <ul className="list-disc list-inside space-y-1 text-semantic-secondary">
            <li><code className="text-xs bg-semantic-tertiary px-1 py-0.5 rounded">aria-invalid</code> - Indicates validation state</li>
            <li><code className="text-xs bg-semantic-tertiary px-1 py-0.5 rounded">aria-describedby</code> - Links to error messages</li>
            <li><code className="text-xs bg-semantic-tertiary px-1 py-0.5 rounded">aria-required</code> - Marks required fields</li>
            <li><code className="text-xs bg-semantic-tertiary px-1 py-0.5 rounded">id</code> - Proper label associations</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}