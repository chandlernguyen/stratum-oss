import { forwardRef, useCallback, useImperativeHandle, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { getLocaleHeaders } from '@/lib/apiHeaders'

interface FileUploadRef {
  handleUpload: () => Promise<void>;
}

const FileUpload = forwardRef<FileUploadRef, {}>((_props, ref) => {
  const [files, setFiles] = useState<File[]>([])

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setFiles(prevFiles => [...prevFiles, ...acceptedFiles])
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop })

  const removeFile = (file: File) => {
    setFiles(prevFiles => prevFiles.filter(f => f !== file))
  }

  useImperativeHandle(ref, () => ({
    handleUpload: async () => {
      if (files.length === 0) {
        console.log("No files to upload.")
        return
      }

      console.log("Uploading files:", files)

      const uploadPromises = files.map(file => {
        const formData = new FormData()
        formData.append('file', file)
        // TODO: Add other metadata from a form

        return fetch('/api/documents/upload', {
          method: 'POST',
          headers: getLocaleHeaders(),
          body: formData,
        })
      })

      try {
        await Promise.all(uploadPromises)
        console.log("All files uploaded successfully.")
        setFiles([])
      } catch (error) {
        console.error("Error uploading files:", error)
      }
    }
  }));

  return (
    <div>
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors ${
          isDragActive ? 'border-primary bg-primary/10' : 'border-muted-foreground/50 hover:border-primary'
        }`}>
        <input {...getInputProps()} />
        {
          isDragActive ?
            <p className="text-primary">Drop the files here ...</p> :
            <p className="text-muted-foreground">Drag 'n' drop some files here, or click to select files</p>
        }
      </div>
      {files.length > 0 && (
        <div className="mt-4">
          <h4 className="font-semibold">Files to upload:</h4>
          <ul>
            {files.map((file, i) => (
              <li key={i} className="flex items-center justify-between mt-2">
                <span>{file.name}</span>
                <button onClick={() => removeFile(file)} className="text-red-500 hover:text-red-700">Remove</button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
})

export { FileUpload, type FileUploadRef }
