export default function PageHero({
    title,
    subtitle,
    icon: Icon,
    action
}) {
    return (
        <div className="relative overflow-hidden rounded-2xl border border-white/70 bg-gradient-to-r from-[#0f2d62] via-[#184389] to-[#1460a8] p-5 text-white shadow-xl shadow-blue-200/30">
            <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
            <div className="pointer-events-none absolute -left-10 -bottom-14 h-44 w-44 rounded-full bg-cyan-200/20 blur-2xl" />

            <div className="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="flex items-start gap-3">
                    {Icon && (
                        <div className="mt-0.5 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/25">
                            <Icon className="h-6 w-6 text-white" />
                        </div>
                    )}
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
                        {subtitle && (
                            <p className="mt-1 text-sm text-blue-100">{subtitle}</p>
                        )}
                    </div>
                </div>
                {action ? <div>{action}</div> : null}
            </div>
        </div>
    )
}
