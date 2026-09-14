import { Shield, CheckCircle, XCircle, AlertCircle, Trophy } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface VRIOResource {
  resource_name: string;
  valuable: boolean;
  rare: boolean;
  imitable: boolean;
  organized: boolean;
  competitive_implication: string;
}

interface VRIOAnalysis {
  context: string;
  resources: VRIOResource[];
  core_competencies: string[];
  strategic_implications: string;
}

interface VRIOFrameworkProps {
  data: VRIOAnalysis;
}

const getCompetitiveColor = (implication: string) => {
  if (implication.includes('sustained') || implication.includes('Sustained')) {
    return 'text-brand-success dark:text-green-400 bg-green-50 dark:bg-green-950/30';
  }
  if (implication.includes('temporary') || implication.includes('Temporary')) {
    return 'text-brand-warning dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-950/30';
  }
  if (implication.includes('parity') || implication.includes('Parity')) {
    return 'text-brand-gold dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30';
  }
  return 'text-brand-error dark:text-red-400 bg-red-50 dark:bg-red-950/30';
};

export function VRIOFramework({ data }: VRIOFrameworkProps) {
  const { t } = useTranslation('agents');

  return (
    <div className="w-full my-4">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-slate-100 dark:bg-slate-900/30 rounded-lg">
          <Shield className="w-5 h-5 text-brand-gold dark:text-amber-400" />
        </div>
        <h3 className="text-xl font-semibold text-brand-charcoal dark:text-gray-100">{t('toolRenderers.vrio.title')}</h3>
      </div>

      {/* Context */}
      {data.context && (
        <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <p className="text-sm text-brand-charcoal dark:text-gray-300">{data.context}</p>
        </div>
      )}

      {/* VRIO Table - Hidden on mobile, shown on tablet+ */}
      <div className="hidden md:block overflow-x-auto mb-6">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-100 dark:bg-gray-800">
              <th className="p-3 text-left text-sm font-semibold text-brand-charcoal dark:text-gray-100 border border-gray-200 dark:border-gray-700">
                {t('toolRenderers.vrio.resourceCapability')}
              </th>
              <th className="p-3 text-center text-sm font-semibold text-brand-charcoal dark:text-gray-100 border border-gray-200 dark:border-gray-700 w-24">
                {t('toolRenderers.vrio.valuable')}
              </th>
              <th className="p-3 text-center text-sm font-semibold text-brand-charcoal dark:text-gray-100 border border-gray-200 dark:border-gray-700 w-24">
                {t('toolRenderers.vrio.rare')}
              </th>
              <th className="p-3 text-center text-sm font-semibold text-brand-charcoal dark:text-gray-100 border border-gray-200 dark:border-gray-700 w-24">
                {t('toolRenderers.vrio.inimitable')}
              </th>
              <th className="p-3 text-center text-sm font-semibold text-brand-charcoal dark:text-gray-100 border border-gray-200 dark:border-gray-700 w-24">
                {t('toolRenderers.vrio.organized')}
              </th>
              <th className="p-3 text-left text-sm font-semibold text-brand-charcoal dark:text-gray-100 border border-gray-200 dark:border-gray-700">
                {t('toolRenderers.vrio.competitiveImplication')}
              </th>
            </tr>
          </thead>
          <tbody>
            {data.resources.map((resource, index) => (
              <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                <td className="p-3 text-sm text-brand-charcoal dark:text-gray-100 border border-gray-200 dark:border-gray-700 font-medium">
                  {resource.resource_name}
                </td>
                <td className="p-3 text-center border border-gray-200 dark:border-gray-700">
                  {resource.valuable ? (
                    <CheckCircle className="w-5 h-5 text-brand-success dark:text-green-400 mx-auto" />
                  ) : (
                    <XCircle className="w-5 h-5 text-brand-error dark:text-red-400 mx-auto" />
                  )}
                </td>
                <td className="p-3 text-center border border-gray-200 dark:border-gray-700">
                  {resource.rare ? (
                    <CheckCircle className="w-5 h-5 text-brand-success dark:text-green-400 mx-auto" />
                  ) : (
                    <XCircle className="w-5 h-5 text-brand-error dark:text-red-400 mx-auto" />
                  )}
                </td>
                <td className="p-3 text-center border border-gray-200 dark:border-gray-700">
                  {resource.imitable ? (
                    <CheckCircle className="w-5 h-5 text-brand-success dark:text-green-400 mx-auto" />
                  ) : (
                    <XCircle className="w-5 h-5 text-brand-error dark:text-red-400 mx-auto" />
                  )}
                </td>
                <td className="p-3 text-center border border-gray-200 dark:border-gray-700">
                  {resource.organized ? (
                    <CheckCircle className="w-5 h-5 text-brand-success dark:text-green-400 mx-auto" />
                  ) : (
                    <XCircle className="w-5 h-5 text-brand-error dark:text-red-400 mx-auto" />
                  )}
                </td>
                <td className="p-3 border border-gray-200 dark:border-gray-700">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getCompetitiveColor(resource.competitive_implication)}`}>
                    {resource.competitive_implication}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* VRIO Cards - Mobile view only */}
      <div className="md:hidden space-y-3 mb-6">
        {data.resources.map((resource, index) => (
          <div key={index} className="p-4 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-xl">
            {/* Resource Name */}
            <h4 className="font-semibold text-base text-brand-charcoal dark:text-gray-100 mb-3">
              {resource.resource_name}
            </h4>

            {/* VRIO Attributes Grid */}
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-brand-slate dark:text-gray-400">{t('toolRenderers.vrio.valuable')}:</span>
                {resource.valuable ? (
                  <CheckCircle className="w-4 h-4 text-brand-success dark:text-green-400" />
                ) : (
                  <XCircle className="w-4 h-4 text-brand-error dark:text-red-400" />
                )}
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-brand-slate dark:text-gray-400">{t('toolRenderers.vrio.rare')}:</span>
                {resource.rare ? (
                  <CheckCircle className="w-4 h-4 text-brand-success dark:text-green-400" />
                ) : (
                  <XCircle className="w-4 h-4 text-brand-error dark:text-red-400" />
                )}
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-brand-slate dark:text-gray-400">{t('toolRenderers.vrio.inimitable')}:</span>
                {resource.imitable ? (
                  <CheckCircle className="w-4 h-4 text-brand-success dark:text-green-400" />
                ) : (
                  <XCircle className="w-4 h-4 text-brand-error dark:text-red-400" />
                )}
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-brand-slate dark:text-gray-400">{t('toolRenderers.vrio.organized')}:</span>
                {resource.organized ? (
                  <CheckCircle className="w-4 h-4 text-brand-success dark:text-green-400" />
                ) : (
                  <XCircle className="w-4 h-4 text-brand-error dark:text-red-400" />
                )}
              </div>
            </div>

            {/* Competitive Implication */}
            <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
              <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium ${getCompetitiveColor(resource.competitive_implication)}`}>
                <Trophy className="w-3.5 h-3.5" />
                <span>{resource.competitive_implication}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Core Competencies */}
      {data.core_competencies && data.core_competencies.length > 0 && (
        <div className="mb-4 p-4 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-200 dark:border-green-800">
          <div className="flex items-center gap-2 mb-2">
            <Trophy className="w-5 h-5 text-brand-success dark:text-green-400" />
            <h4 className="font-semibold text-brand-charcoal dark:text-gray-100">{t('toolRenderers.vrio.coreCompetencies')}</h4>
          </div>
          <ul className="space-y-1">
            {data.core_competencies.map((competency, index) => (
              <li key={index} className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-green-600 dark:bg-green-400 mt-1.5 flex-shrink-0" />
                <span className="text-sm text-brand-charcoal dark:text-gray-300">{competency}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Strategic Implications */}
      <div className="p-4 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-200 dark:border-amber-800">
        <div className="flex items-center gap-2 mb-2">
          <AlertCircle className="w-5 h-5 text-brand-gold dark:text-amber-400" />
          <h4 className="font-semibold text-brand-charcoal dark:text-gray-100">{t('toolRenderers.vrio.strategicImplications')}</h4>
        </div>
        <p className="text-sm text-brand-charcoal dark:text-gray-300">{data.strategic_implications}</p>
      </div>

      {/* Legend */}
      <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <div className="text-xs text-brand-slate dark:text-gray-400">
          <div className="font-semibold mb-2">{t('toolRenderers.vrio.frameworkKey')}</div>
          <div className="grid grid-cols-2 gap-2">
            <div>• <span className="font-medium">V</span>{t('toolRenderers.vrio.valuableDesc')}</div>
            <div>• <span className="font-medium">R</span>{t('toolRenderers.vrio.rareDesc')}</div>
            <div>• <span className="font-medium">I</span>{t('toolRenderers.vrio.inimitableDesc')}</div>
            <div>• <span className="font-medium">O</span>{t('toolRenderers.vrio.organizedDesc')}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
