import { supabase } from '@/lib/supabase';
import { generateSummary } from '@/lib/gemini';

export interface Note {
  id: string;
  user_id: string;
  title: string;
  content: string;
  summary: string | null;
  file_url: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Upload a note file to Supabase Storage
 */
export async function uploadNoteFile(file: File, userId: string): Promise<string | null> {
  try {
    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}/${Date.now()}.${fileExt}`;

    const { data, error } = await supabase.storage
      .from('notes')
      .upload(fileName, file);

    if (error) throw error;

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('notes')
      .getPublicUrl(data.path);

    return urlData.publicUrl;
  } catch (error) {
    console.error('Error uploading file:', error);
    return null;
  }
}

/**
 * Extract text from uploaded file
 * Supports text files and PDFs
 */
export async function extractTextFromFile(file: File): Promise<string> {
  return new Promise(async (resolve, reject) => {
    try {
      // Handle text files
      if (file.type === 'text/plain' || file.name.endsWith('.txt')) {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.onerror = reject;
        reader.readAsText(file);
      } else if (file.type.startsWith('text/')) {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.onerror = reject;
        reader.readAsText(file);
      } 
      // Handle PDF files
      else if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
        try {
          // Dynamically import pdfjs-dist
          const pdfjsLib = await import('pdfjs-dist');
          
          // Configure worker to use a path that Vite can serve
          // Import worker as a module URL which Vite will handle
          if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
            try {
              // Try importing worker as a module - Vite will handle it
              const workerModule = await import('pdfjs-dist/build/pdf.worker.min.mjs?url');
              pdfjsLib.GlobalWorkerOptions.workerSrc = workerModule.default;
            } catch (e) {
              // If module import fails, disable worker (runs on main thread)
              console.warn('Could not load PDF worker, using main thread');
              pdfjsLib.GlobalWorkerOptions.workerSrc = '';
            }
          }
          
          // Read file as array buffer
          const arrayBuffer = await file.arrayBuffer();
          
          // Load PDF document - PDF.js will automatically fallback to main thread if worker fails
          const loadingTask = pdfjsLib.getDocument({ 
            data: arrayBuffer,
            useSystemFonts: true,
            verbosity: 0, // Reduce console warnings
          });
          const pdf = await loadingTask.promise;
          
          // Extract text from all pages
          let fullText = '';
          for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
            const page = await pdf.getPage(pageNum);
            const textContent = await page.getTextContent();
            
            // Combine text items from the page, preserving some structure
            const pageText = textContent.items
              .map((item: any) => item.str)
              .join(' ');
            
            fullText += pageText + '\n\n';
          }
          
          const extractedText = fullText.trim();
          if (!extractedText) {
            reject(new Error(`Unable to extract text from this PDF (${file.name}). The file may be image-based, encrypted, or contain no extractable text.`));
            return;
          }
          
          resolve(extractedText);
        } catch (pdfError: any) {
          console.error('Error extracting text from PDF:', pdfError);
          reject(new Error(`Failed to extract text from PDF: ${pdfError.message || 'Unknown error'}`));
        }
      } 
      // For other file types, return error message
      else {
        reject(new Error(`Unsupported file type: ${file.type || 'unknown'}. Please upload a text file (.txt) or PDF file (.pdf).`));
      }
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Create a new note
 */
export async function createNote(
  userId: string,
  title: string,
  content: string,
  fileUrl?: string | null
) {
  try {
    const { data, error } = await supabase
      .from('notes')
      .insert({
        user_id: userId,
        title,
        content,
        file_url: fileUrl,
      })
      .select()
      .single();

    if (error) throw error;
    return { note: data, error: null };
  } catch (error: any) {
    console.error('Error creating note:', error);
    return { note: null, error: error.message };
  }
}

/**
 * Generate summary for a note using Gemini
 */
export async function generateNoteSummary(noteId: string, content: string) {
  try {
    const summary = await generateSummary(content);

    // Update note with summary
    const { error } = await supabase
      .from('notes')
      .update({ summary })
      .eq('id', noteId);

    if (error) throw error;

    return { summary, error: null };
  } catch (error: any) {
    console.error('Error generating summary:', error);
    return { summary: null, error: error.message };
  }
}


/**
 * Get all notes for a user
 */
export async function getUserNotes(userId: string) {
  try {
    const { data, error } = await supabase
      .from('notes')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return { notes: data, error: null };
  } catch (error: any) {
    console.error('Error fetching notes:', error);
    return { notes: null, error: error.message };
  }
}

/**
 * Delete a note
 */
export async function deleteNote(noteId: string) {
  try {
    const { error } = await supabase
      .from('notes')
      .delete()
      .eq('id', noteId);

    if (error) throw error;
    return { error: null };
  } catch (error: any) {
    console.error('Error deleting note:', error);
    return { error: error.message };
  }
}

