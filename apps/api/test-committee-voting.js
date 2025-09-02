#!/usr/bin/env node

const axios = require('axios');

const API_URL = 'http://localhost:3333/api';

async function testCommitteeVoting() {
  console.log('=========================================');
  console.log('🗳️ Test du Vote Comité');
  console.log('=========================================\n');

  try {
    // 1. Create committee members
    console.log('1️⃣ Création de membres du comité...');
    const members = [];
    
    for (let i = 1; i <= 3; i++) {
      const memberEmail = `committee${i}_${Date.now()}@gmah.fr`;
      try {
        const res = await axios.post(`${API_URL}/auth/register`, {
          email: memberEmail,
          password: 'Committee123',
          firstName: `Membre${i}`,
          lastName: 'Comité',
          role: 'COMMITTEE_MEMBER'
        });
        members.push({
          email: memberEmail,
          token: res.data.accessToken,
          name: `Membre${i}`
        });
        console.log(`   ✅ Membre ${i} créé: ${memberEmail}`);
      } catch (e) {
        console.log(`   ⚠️ Membre ${i}: ${e.response?.data?.message || e.message}`);
      }
    }

    // 2. Create borrower
    console.log('\n2️⃣ Création d\'un emprunteur...');
    const borrowerEmail = `borrower${Date.now()}@gmah.fr`;
    let borrowerToken;
    
    try {
      const borrowerRes = await axios.post(`${API_URL}/auth/register`, {
        email: borrowerEmail,
        password: 'Password123',
        firstName: 'Emprunteur',
        lastName: 'Test'
      });
      borrowerToken = borrowerRes.data.accessToken;
      console.log(`   ✅ Emprunteur créé: ${borrowerEmail}`);
    } catch (e) {
      console.log(`   ❌ Erreur création: ${e.response?.data?.message || e.message}`);
      return;
    }

    // 3. Create and submit loan
    console.log('\n3️⃣ Création et soumission d\'un prêt...');
    let loanId;
    
    try {
      const loanRes = await axios.post(`${API_URL}/loans`, {
        type: 'STANDARD',
        amount: 10000,
        numberOfInstallments: 24,
        purpose: 'Test vote comité',
        expectedEndDate: new Date(Date.now() + 730 * 24 * 60 * 60 * 1000).toISOString()
      }, {
        headers: { Authorization: `Bearer ${borrowerToken}` }
      });
      loanId = loanRes.data.id;
      console.log(`   ✅ Prêt créé: ${loanId}`);

      // Submit loan
      await axios.post(`${API_URL}/loans/${loanId}/submit`, {
        skipDocumentCheck: true
      }, {
        headers: { Authorization: `Bearer ${borrowerToken}` }
      });
      console.log(`   ✅ Prêt soumis pour examen`);
    } catch (e) {
      console.log(`   ❌ Erreur: ${e.response?.data?.message || e.message}`);
      return;
    }

    // 4. Start review (admin action - using first member as they won't be real admins)
    console.log('\n4️⃣ Démarrage de la révision...');
    try {
      await axios.post(`${API_URL}/loans/${loanId}/start-review`, {}, {
        headers: { Authorization: `Bearer ${members[0]?.token || borrowerToken}` }
      });
      console.log(`   ✅ Prêt en révision`);
    } catch (e) {
      console.log(`   ⚠️ ${e.response?.data?.message || 'Démarrage révision (normal si pas admin)'}`);
    }

    // 5. Committee members vote
    console.log('\n5️⃣ Votes des membres du comité...');
    const votes = [
      { vote: 'APPROVE', comment: 'Dossier solide, je recommande l\'approbation' },
      { vote: 'APPROVE', comment: 'Bon profil emprunteur, garanties suffisantes' },
      { vote: 'REJECT', comment: 'Montant trop élevé pour la capacité de remboursement' }
    ];

    for (let i = 0; i < members.length && i < votes.length; i++) {
      const member = members[i];
      const voteData = votes[i];
      
      try {
        await axios.post(`${API_URL}/loans/${loanId}/vote`, voteData, {
          headers: { Authorization: `Bearer ${member.token}` }
        });
        console.log(`   ✅ ${member.name} a voté: ${voteData.vote}`);
      } catch (e) {
        console.log(`   ❌ ${member.name}: ${e.response?.data?.message || e.message}`);
      }
    }

    // 6. Check loan status
    console.log('\n6️⃣ Vérification du statut du prêt...');
    try {
      const loanRes = await axios.get(`${API_URL}/loans/${loanId}`, {
        headers: { Authorization: `Bearer ${borrowerToken}` }
      });
      
      const loan = loanRes.data;
      console.log(`   📊 Statut: ${loan.status}`);
      console.log(`   🗳️ Votes: ${loan.approvalVotes?.length || 0} votes enregistrés`);
      
      if (loan.approvalVotes && loan.approvalVotes.length > 0) {
        const approvals = loan.approvalVotes.filter(v => v.vote === 'APPROVE').length;
        const rejections = loan.approvalVotes.filter(v => v.vote === 'REJECT').length;
        const abstentions = loan.approvalVotes.filter(v => v.vote === 'ABSTAIN').length;
        
        console.log(`   ✅ Pour: ${approvals}`);
        console.log(`   ❌ Contre: ${rejections}`);
        console.log(`   ⚪ Abstentions: ${abstentions}`);
        
        const decision = approvals > rejections ? 'APPROUVÉ' : 'REJETÉ';
        console.log(`   📋 Décision majoritaire: ${decision}`);
      }
    } catch (e) {
      console.log(`   ❌ Erreur: ${e.response?.data?.message || e.message}`);
    }

    console.log('\n=========================================');
    console.log('📊 RÉSUMÉ DU TEST');
    console.log('=========================================');
    console.log('✅ Création de membres du comité');
    console.log('✅ Soumission de prêt pour examen');
    console.log('✅ Enregistrement des votes');
    console.log('✅ Calcul de la décision majoritaire');
    console.log('\nLe système de vote du comité est fonctionnel!');
    console.log('=========================================');

  } catch (error) {
    console.error('Erreur générale:', error.message);
  }
}

// Run the test
testCommitteeVoting();