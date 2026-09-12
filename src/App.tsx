import React, { useState, useRef } from 'react';
import { GoogleGenAI, Type } from '@google/genai';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { FileText, Download, Loader2, BookOpen, Sparkles, FileUp, Image as ImageIcon, AlertTriangle, Coffee } from 'lucide-react';
import * as mammoth from 'mammoth';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export default function App() {
  const [docxFile, setDocxFile] = useState<File | null>(null);
  const [extractedHtml, setExtractedHtml] = useState('');
  const [extractedImages, setExtractedImages] = useState<{data: string, mimeType: string}[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [outputMarkdown, setOutputMarkdown] = useState('');
  const [targetStyle, setTargetStyle] = useState('Standard Academic');
  const [warningMessage, setWarningMessage] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const compressImage = (base64Str: string, mimeType: string, maxWidth = 800): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = `data:${mimeType};base64,${base64Str}`;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.7);
          resolve(compressedDataUrl.split(',')[1]);
        } else {
          resolve(base64Str);
        }
      };
      img.onerror = () => resolve(base64Str);
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setDocxFile(file);
    setIsProcessing(true);
    setWarningMessage('');
    
    try {
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.convertToHtml({ arrayBuffer });
      let html = result.value;
      
      // Parse HTML to extract images and remove their massive base64 strings from the HTML
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      const images = doc.querySelectorAll('img');
      
      const extractedImgs: {data: string, mimeType: string}[] = [];
      let skippedImages = 0;

      for (let i = 0; i < images.length; i++) {
        const img = images[i];
        const src = img.src;
        
        if (src.startsWith('data:')) {
          if (extractedImgs.length >= 15) {
            skippedImages++;
            img.remove(); // Remove excess images from HTML
            continue; // Limit to 15 images to prevent token overflow
          }

          const [prefix, base64] = src.split(',');
          const mimeType = prefix.split(':')[1].split(';')[0];
          
          const compressedBase64 = await compressImage(base64, mimeType);
          extractedImgs.push({ data: compressedBase64, mimeType: 'image/jpeg' });
          
          // Replace the massive base64 string in the HTML with a simple placeholder
          // This prevents the HTML string itself from being millions of characters long
          img.src = `[Image ${extractedImgs.length} extracted for analysis]`;
          img.alt = `Figure ${extractedImgs.length}`;
        }
      }

      // Serialize the HTML back to a string without the massive base64 images
      html = doc.body.innerHTML;

      // Truncate HTML if it's still absurdly large (e.g., > 1.5M chars)
      if (html.length > 1500000) {
        html = html.substring(0, 1500000) + "\n<p>[Document truncated due to size limits]</p>";
        setWarningMessage("Document text is very large. Only the first portion will be analyzed.");
      } else if (skippedImages > 0) {
        setWarningMessage(`Document contains many images. Only the first 15 images will be analyzed to prevent size limits.`);
      }
      
      setExtractedHtml(html);
      setExtractedImages(extractedImgs);
    } catch (error) {
      console.error("Error parsing DOCX:", error);
      alert("Failed to parse DOCX file. Please ensure it's a valid Word document.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAnalyze = async () => {
    if (!extractedHtml) return;
    
    setIsProcessing(true);
    setOutputMarkdown('');

    try {
      const prompt = `You are an expert academic editor and researcher. I will provide a draft of a research paper extracted from a DOCX file (in HTML format), and any figures/tables found in it.
Your task is to:
1. Rewrite the text in a highly professional, scientific, and academic tone following the "${targetStyle}" style guidelines.
2. Format the paper properly with standard sections (Abstract, Introduction, Methods, Results, Discussion, Conclusion) if applicable.
3. Format all mathematical formulas using LaTeX syntax (e.g., $E=mc^2$ for inline, $$...$$ for block).
4. Use the googleSearch tool to find GENUINE, real-world journal papers to support the claims made in the draft. Insert appropriate citations in the text (e.g., [1], [2]).
5. Provide a complete 'References' section at the end with the real papers you found.
6. Output the final result in Markdown format.

Here is the extracted draft HTML:
${extractedHtml}`;

      const parts: any[] = [{ text: prompt }];
      
      for (const img of extractedImages) {
        parts.push({
          inlineData: { data: img.data, mimeType: img.mimeType }
        });
      }

      const responseStream = await ai.models.generateContentStream({
        model: 'gemini-3.1-pro-preview',
        contents: { parts },
        tools: [{ googleSearch: {} }],
        toolConfig: { includeServerSideToolInvocations: true },
      });

      for await (const chunk of responseStream) {
        if (chunk.text) {
          setOutputMarkdown((prev) => prev + chunk.text);
        }
      }
    } catch (error) {
      console.error('Error generating content:', error);
      setOutputMarkdown('**An error occurred while processing your request.**\n\n' + String(error));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleExport = () => {
    const blob = new Blob([outputMarkdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'scientific_paper.md';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-neutral-50 p-4 md:p-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">
        <header className="flex items-center justify-between pb-6 border-b border-neutral-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary text-primary-foreground rounded-lg">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">SciWrite Pro</h1>
              <p className="text-sm text-muted-foreground">AI-Powered Research Paper Editor & Formatter</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              className="gap-2 border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 hover:text-amber-800"
              onClick={() => window.open('https://buymeacoffee.com/kumarrsgisw', '_blank')}
            >
              <Coffee className="w-4 h-4" />
              Buy Me a Coffee
            </Button>
            {outputMarkdown && (
              <Button onClick={handleExport} variant="outline" className="gap-2">
                <Download className="w-4 h-4" />
                Export Markdown
              </Button>
            )}
          </div>
        </header>

        <main className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Input Section */}
          <Card className="flex flex-col h-[calc(100vh-12rem)]">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <FileUp className="w-5 h-5" />
                Upload Document
              </CardTitle>
              <CardDescription>
                Upload your .docx file containing your draft, figures, and tables.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col gap-6 overflow-hidden">
              
              <div className="space-y-4">
                <div className="border-2 border-dashed border-neutral-200 rounded-lg p-8 text-center hover:bg-neutral-50 transition-colors cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                  <FileText className="w-10 h-10 text-neutral-400 mx-auto mb-4" />
                  <p className="text-sm font-medium text-neutral-700">
                    {docxFile ? docxFile.name : "Click to upload your .docx file"}
                  </p>
                  <p className="text-xs text-neutral-500 mt-1">
                    Only Microsoft Word (.docx) files are supported
                  </p>
                  <Input
                    id="docx-file"
                    type="file"
                    accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    className="hidden"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                  />
                </div>

                {extractedHtml && (
                  <div className="bg-green-50 text-green-700 p-3 rounded-md text-sm flex items-start gap-2">
                    <Sparkles className="w-4 h-4 mt-0.5 shrink-0" />
                    <div className="flex-1">
                      <p className="font-medium">Document parsed successfully!</p>
                      <p className="text-xs opacity-80 mt-1">
                        Found {extractedImages.length} image(s) and extracted text.
                      </p>
                    </div>
                  </div>
                )}

                {warningMessage && (
                  <div className="bg-amber-50 text-amber-700 p-3 rounded-md text-sm flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                    <p className="flex-1">{warningMessage}</p>
                  </div>
                )}
              </div>
              
              <div className="space-y-2 mt-auto">
                <Label htmlFor="style">Target Style</Label>
                <Select value={targetStyle} onValueChange={setTargetStyle}>
                  <SelectTrigger id="style">
                    <SelectValue placeholder="Select style" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Standard Academic">Standard Academic</SelectItem>
                    <SelectItem value="Nature">Nature</SelectItem>
                    <SelectItem value="Science">Science</SelectItem>
                    <SelectItem value="IEEE">IEEE</SelectItem>
                    <SelectItem value="APA">APA</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button 
                onClick={handleAnalyze} 
                disabled={isProcessing || !extractedHtml}
                className="w-full gap-2"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Rewrite & Cite
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Output Section */}
          <Card className="flex flex-col h-[calc(100vh-12rem)]">
            <CardHeader>
              <CardTitle className="text-lg">Polished Paper</CardTitle>
              <CardDescription>
                Scientifically formatted output with genuine citations.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 overflow-hidden">
              <Tabs defaultValue="preview" className="h-full flex flex-col">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="preview">Preview</TabsTrigger>
                  <TabsTrigger value="markdown">Raw Markdown</TabsTrigger>
                </TabsList>
                
                <TabsContent value="preview" className="flex-1 overflow-hidden mt-4 border rounded-md">
                  <ScrollArea className="h-full w-full p-6 bg-white">
                    {outputMarkdown ? (
                      <div className="prose prose-sm md:prose-base prose-neutral max-w-none">
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm, remarkMath]}
                          rehypePlugins={[rehypeKatex]}
                        >
                          {outputMarkdown}
                        </ReactMarkdown>
                      </div>
                    ) : (
                      <div className="h-full flex items-center justify-center text-muted-foreground text-sm italic">
                        Your polished paper will appear here...
                      </div>
                    )}
                  </ScrollArea>
                </TabsContent>
                
                <TabsContent value="markdown" className="flex-1 overflow-hidden mt-4 border rounded-md">
                  <ScrollArea className="h-full w-full p-4 bg-neutral-50">
                    {outputMarkdown ? (
                      <pre className="text-sm font-mono whitespace-pre-wrap break-words">
                        {outputMarkdown}
                      </pre>
                    ) : (
                      <div className="h-full flex items-center justify-center text-muted-foreground text-sm italic">
                        Raw markdown will appear here...
                      </div>
                    )}
                  </ScrollArea>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
}
