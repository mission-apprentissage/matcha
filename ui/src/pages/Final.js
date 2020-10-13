import React from 'react'
import { Col } from 'react-bootstrap'

import { Button, Title } from '../components'
import { Context } from '../context'

export default () => {
  const {
    profile: { candidat },
  } = React.useContext(Context)
  return (
    <Col className='m-5 d-flex flex-column flex-column'>
      <Title>Merci {candidat && candidat.prenom} d'avoir complété votre profil !</Title>
      <Title className='mt-3 mb-5'>Je le transfère tout de suite aux entreprises que j'ai identifié pour vous.</Title>
      <Button>Sauvegarder mon profil</Button>
    </Col>
  )
}
