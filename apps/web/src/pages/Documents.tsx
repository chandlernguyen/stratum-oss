import { useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { FileUpload } from '@/components/documents/FileUpload'

export function Documents() {
  const { t } = useTranslation('library')
  const fileUploadRef = useRef<any>(null)

  const handleUploadClick = () => {
    fileUploadRef.current?.handleUpload()
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">{t('title')}</h1>
        <p className="text-muted-foreground">
          {t('subtitle')}
        </p>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>{t('upload.title')}</CardTitle>
            <CardDescription>
              {t('upload.description')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FileUpload ref={fileUploadRef} />
            <Button className="mt-4" onClick={handleUploadClick}>{t('upload.button')}</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('documents.title')}</CardTitle>
            <CardDescription>
              {t('documents.description')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p>{t('documents.emptyState')}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

