'use client'

import Link from 'next/link'

export default function TermsPage() {
  return (
    <div style={{
      minHeight: '100vh',
      height: '100vh',
      background: '#0a0a0b',
      color: 'white',
      overflowY: 'auto',
      WebkitOverflowScrolling: 'touch',
    }}>
      <header style={{
        padding: '20px 24px',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <Link href="/">
          <img src="/logo.svg" alt="Sounded Out" style={{ height: '28px', cursor: 'pointer' }} />
        </Link>
        <Link
          href="/"
          style={{
            padding: '10px 20px',
            background: 'rgba(255,255,255,0.1)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '10px',
            color: 'white',
            textDecoration: 'none',
            fontSize: '14px',
            fontWeight: 600,
          }}
        >
          Open Map
        </Link>
      </header>

      <main style={{
        maxWidth: '800px',
        margin: '0 auto',
        padding: '48px 24px 80px',
      }}>
        <h1 style={{ fontSize: '32px', fontWeight: 700, marginBottom: '8px' }}>Terms &amp; Conditions</h1>
        <p style={{ color: '#9ca3af', marginBottom: '40px', fontSize: '14px' }}>Last updated: February 2026</p>

        <div style={{ color: '#d1d5db', fontSize: '15px', lineHeight: '1.8' }}>

          <p style={{ marginBottom: '24px', padding: '16px', background: 'rgba(171,103,247,0.1)', border: '1px solid rgba(171,103,247,0.2)', borderRadius: '10px', fontSize: '14px' }}>
            <strong style={{ color: '#ab67f7' }}>IMPORTANT:</strong> Please read these Terms carefully before using Sounded Out. By accessing or using the Service, you agree to be legally bound by these Terms. If you do not agree, do not use the Service.
          </p>

          <h2 style={{ fontSize: '20px', fontWeight: 600, color: 'white', marginTop: '36px', marginBottom: '12px' }}>1. Definitions</h2>
          <p>&quot;Service&quot; means the Sounded Out website at soundedout.com, including all pages, features, and content.</p>
          <p>&quot;We&quot;, &quot;our&quot;, &quot;us&quot; refers to Sounded Out, operated by Oliver Cormack as a sole trader registered in England.</p>
          <p>&quot;User&quot;, &quot;you&quot;, &quot;your&quot; refers to any individual who accesses or uses the Service.</p>
          <p>&quot;Content&quot; means all event listings, venue information, images, text, data, and other material displayed on the Service.</p>
          <p style={{ marginBottom: '24px' }}>&quot;Third-Party Services&quot; means any external websites, platforms, ticketing providers, or services linked to or integrated with the Service.</p>

          <h2 style={{ fontSize: '20px', fontWeight: 600, color: 'white', marginTop: '36px', marginBottom: '12px' }}>2. Nature of the Service</h2>
          <p>Sounded Out is an <strong>information aggregation platform only</strong>. We aggregate and display publicly available event and venue information from third-party sources to help users discover nightlife events.</p>
          <p>We are <strong>not</strong> an event organiser, venue operator, ticket seller, or promoter. We do not organise, host, manage, endorse, sponsor, or have any involvement in any events displayed on the Service.</p>
          <p>We do not sell tickets. Any ticket purchases are made directly through third-party ticketing platforms and are governed entirely by their terms and conditions. We have no involvement in, and accept no responsibility for, any transactions between you and third-party providers.</p>
          <p style={{ marginBottom: '24px' }}>The Service is provided as a free discovery tool. We make no representations about the suitability, availability, or quality of any events, venues, or experiences listed.</p>

          <h2 style={{ fontSize: '20px', fontWeight: 600, color: 'white', marginTop: '36px', marginBottom: '12px' }}>3. No Warranties</h2>
          <p>The Service is provided on an <strong>&quot;AS IS&quot; and &quot;AS AVAILABLE&quot;</strong> basis without any warranties of any kind, whether express, implied, or statutory.</p>
          <p>We expressly disclaim all warranties including, but not limited to, implied warranties of merchantability, fitness for a particular purpose, non-infringement, and accuracy.</p>
          <p>Without limiting the foregoing, we do not warrant that:</p>
          <p style={{ paddingLeft: '20px' }}>
            (a) any event information (including dates, times, prices, lineups, availability, age restrictions, or venue details) is accurate, complete, current, or reliable;<br/>
            (b) the Service will be uninterrupted, timely, secure, or error-free;<br/>
            (c) any events listed will actually take place as described or at all;<br/>
            (d) any venue or event organiser is legitimate, licensed, or compliant with applicable laws;<br/>
            (e) the results obtained from the use of the Service will be accurate or reliable.
          </p>
          <p style={{ marginBottom: '24px' }}>Event details including times, prices, lineups, locations, and availability are subject to change at any time without notice. You are solely responsible for verifying all event details directly with the venue or event organiser before making any decisions, purchases, or travel arrangements.</p>

          <h2 style={{ fontSize: '20px', fontWeight: 600, color: 'white', marginTop: '36px', marginBottom: '12px' }}>4. Limitation of Liability</h2>
          <p style={{ padding: '16px', background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.2)', borderRadius: '10px' }}>
            <strong>TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, SOUNDED OUT, ITS OWNER, OPERATORS, AFFILIATES, AND THEIR RESPECTIVE OFFICERS, DIRECTORS, EMPLOYEES, AND AGENTS SHALL NOT BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, EXEMPLARY, OR PUNITIVE DAMAGES OF ANY KIND ARISING OUT OF OR IN CONNECTION WITH:</strong>
          </p>
          <p style={{ paddingLeft: '20px', marginTop: '16px' }}>
            (a) your use of, or inability to use, the Service;<br/>
            (b) any inaccuracy, error, or omission in any event information or Content;<br/>
            (c) your attendance at, or travel to or from, any event listed on the Service;<br/>
            (d) any personal injury, property damage, or other harm arising from events listed on the Service;<br/>
            (e) any interaction, transaction, or dispute between you and any venue, event organiser, promoter, or ticketing platform;<br/>
            (f) any cancelled, rescheduled, or altered events;<br/>
            (g) any loss of money, including ticket purchases, travel costs, accommodation, or other expenses;<br/>
            (h) any unauthorised access to or alteration of your data or transmissions;<br/>
            (i) any content or conduct of any third party on or linked from the Service;<br/>
            (j) any viruses, bugs, or other harmful components transmitted through the Service.
          </p>
          <p>This limitation applies regardless of the legal theory (contract, tort, negligence, strict liability, or otherwise) and even if we have been advised of the possibility of such damages.</p>
          <p style={{ marginBottom: '24px' }}>In no event shall our total aggregate liability exceed the amount you have paid to us in the twelve (12) months preceding the claim, which in the case of a free service is zero (£0).</p>

          <h2 style={{ fontSize: '20px', fontWeight: 600, color: 'white', marginTop: '36px', marginBottom: '12px' }}>5. Indemnification</h2>
          <p style={{ marginBottom: '24px' }}>You agree to indemnify, defend, and hold harmless Sounded Out, its owner, operators, and affiliates from and against any and all claims, liabilities, damages, losses, costs, and expenses (including reasonable legal fees) arising out of or in connection with: (a) your use of the Service; (b) your violation of these Terms; (c) your violation of any rights of any third party; (d) your attendance at any event listed on the Service; or (e) any content you submit or transmit through the Service.</p>

          <h2 style={{ fontSize: '20px', fontWeight: 600, color: 'white', marginTop: '36px', marginBottom: '12px' }}>6. Assumption of Risk</h2>
          <p>By using the Service to discover events, you acknowledge and agree that:</p>
          <p style={{ paddingLeft: '20px' }}>
            (a) attendance at any event is entirely at your own risk;<br/>
            (b) nightlife events may involve inherent risks including but not limited to loud noise, crowded spaces, alcohol consumption, and late-night travel;<br/>
            (c) we have no control over the safety, security, legality, or quality of any event or venue;<br/>
            (d) you are solely responsible for your own safety, conduct, and wellbeing at any event;<br/>
            (e) you are solely responsible for ensuring you meet any age, identification, or entry requirements.
          </p>
          <p style={{ marginBottom: '24px' }}>We strongly recommend checking entry requirements, age restrictions, and venue policies directly before attending any event.</p>

          <h2 style={{ fontSize: '20px', fontWeight: 600, color: 'white', marginTop: '36px', marginBottom: '12px' }}>7. User Accounts</h2>
          <p>Some features may require you to create an account. You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account.</p>
          <p>You agree to provide accurate, current, and complete information when creating an account. We reserve the right to suspend or terminate accounts at our sole discretion without notice or liability.</p>
          <p style={{ marginBottom: '24px' }}>You may delete your account at any time. Upon deletion, we will remove your personal data in accordance with our Privacy Policy.</p>

          <h2 style={{ fontSize: '20px', fontWeight: 600, color: 'white', marginTop: '36px', marginBottom: '12px' }}>8. Venue &amp; Event Claims</h2>
          <p>Venue owners and event organisers may claim their listings through our platform. By claiming a listing, you represent and warrant that you have the legal authority to manage that venue or event.</p>
          <p style={{ marginBottom: '24px' }}>We reserve the right to verify, reject, or revoke claims at our sole discretion. Misrepresentation of ownership or authority may result in immediate account termination and may be reported to relevant authorities.</p>

          <h2 style={{ fontSize: '20px', fontWeight: 600, color: 'white', marginTop: '36px', marginBottom: '12px' }}>9. Intellectual Property</h2>
          <p>The Service and its original content, features, functionality, design, and branding are owned by Sounded Out and are protected by copyright, trademark, and other intellectual property laws.</p>
          <p style={{ marginBottom: '24px' }}>Event information, venue names, artist names, images, and related content may be the property of their respective owners. Our display of such content does not imply endorsement, affiliation, or sponsorship.</p>

          <h2 style={{ fontSize: '20px', fontWeight: 600, color: 'white', marginTop: '36px', marginBottom: '12px' }}>10. Third-Party Links &amp; Services</h2>
          <p>The Service contains links to third-party websites, ticketing platforms, and services. These include but are not limited to Fatsoma, Skiddle, DICE, Resident Advisor, Eventbrite, and individual venue websites.</p>
          <p>We have no control over, and assume no responsibility for, the content, privacy policies, practices, availability, or accuracy of any third-party websites or services. Your use of third-party services is governed entirely by their own terms and conditions.</p>
          <p style={{ marginBottom: '24px' }}>The inclusion of any link does not imply endorsement, affiliation, or recommendation by Sounded Out.</p>

          <h2 style={{ fontSize: '20px', fontWeight: 600, color: 'white', marginTop: '36px', marginBottom: '12px' }}>11. Data &amp; Content Accuracy</h2>
          <p>Event data displayed on the Service is aggregated from multiple third-party sources using automated systems. While we make reasonable efforts to ensure accuracy, automated aggregation may result in errors, outdated information, or incomplete listings.</p>
          <p style={{ marginBottom: '24px' }}>We accept no liability for any errors, omissions, or inaccuracies in the Content. If you are a venue or event organiser and believe any information is incorrect, please contact us at oliver@soundedout.com and we will make reasonable efforts to correct it.</p>

          <h2 style={{ fontSize: '20px', fontWeight: 600, color: 'white', marginTop: '36px', marginBottom: '12px' }}>12. Prohibited Use</h2>
          <p>You agree not to: (a) use the Service for any unlawful purpose; (b) attempt to gain unauthorised access to any part of the Service; (c) interfere with or disrupt the Service; (d) scrape, copy, or extract data from the Service without permission; (e) use the Service to send spam or unsolicited communications; (f) impersonate any person or entity.</p>
          <p style={{ marginBottom: '24px' }}>Violation of these restrictions may result in immediate termination of access and may be reported to relevant authorities.</p>

          <h2 style={{ fontSize: '20px', fontWeight: 600, color: 'white', marginTop: '36px', marginBottom: '12px' }}>13. Service Availability</h2>
          <p style={{ marginBottom: '24px' }}>We reserve the right to modify, suspend, or discontinue the Service (or any part thereof) at any time without notice or liability. We shall not be liable to you or any third party for any modification, suspension, or discontinuance of the Service.</p>

          <h2 style={{ fontSize: '20px', fontWeight: 600, color: 'white', marginTop: '36px', marginBottom: '12px' }}>14. Governing Law &amp; Jurisdiction</h2>
          <p style={{ marginBottom: '24px' }}>These Terms shall be governed by and construed in accordance with the laws of England and Wales. Any disputes arising from these Terms or your use of the Service shall be subject to the exclusive jurisdiction of the courts of England and Wales. Nothing in these Terms shall limit any rights you may have under applicable consumer protection legislation.</p>

          <h2 style={{ fontSize: '20px', fontWeight: 600, color: 'white', marginTop: '36px', marginBottom: '12px' }}>15. Severability</h2>
          <p style={{ marginBottom: '24px' }}>If any provision of these Terms is held to be invalid, illegal, or unenforceable, the remaining provisions shall continue in full force and effect. The invalid provision shall be modified to the minimum extent necessary to make it valid and enforceable.</p>

          <h2 style={{ fontSize: '20px', fontWeight: 600, color: 'white', marginTop: '36px', marginBottom: '12px' }}>16. Entire Agreement</h2>
          <p style={{ marginBottom: '24px' }}>These Terms, together with our Privacy Policy, constitute the entire agreement between you and Sounded Out regarding your use of the Service and supersede all prior agreements and understandings.</p>

          <h2 style={{ fontSize: '20px', fontWeight: 600, color: 'white', marginTop: '36px', marginBottom: '12px' }}>17. Changes to Terms</h2>
          <p style={{ marginBottom: '24px' }}>We reserve the right to modify these Terms at any time. Changes take effect immediately upon posting to the Service. Your continued use of the Service after changes constitutes acceptance of the revised Terms. It is your responsibility to review these Terms periodically.</p>

          <h2 style={{ fontSize: '20px', fontWeight: 600, color: 'white', marginTop: '36px', marginBottom: '12px' }}>18. Contact Us</h2>
          <p style={{ marginBottom: '40px' }}>If you have any questions about these Terms, please contact us at <a href="mailto:oliver@soundedout.com" style={{ color: '#ab67f7' }}>oliver@soundedout.com</a></p>

        </div>

        <div style={{
          display: 'flex',
          gap: '16px',
          paddingTop: '24px',
          borderTop: '1px solid rgba(255,255,255,0.08)',
          fontSize: '14px',
        }}>
          <Link href="/about" style={{ color: '#9ca3af', textDecoration: 'none' }}>About</Link>
          <Link href="/privacy" style={{ color: '#9ca3af', textDecoration: 'none' }}>Privacy Policy</Link>
          <Link href="/" style={{ color: '#ab67f7', textDecoration: 'none' }}>Back to Map</Link>
        </div>
      </main>
    </div>
  )
}
